import requests
from bs4 import BeautifulSoup
import json
import os
import time
import argparse
import sys
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://ncrdb.usga.org/"
COURSE_DETAIL_URL = "https://ncrdb.usga.org/courseTeeInfo"

def get_soup(url, method='GET', data=None):
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=30, verify=False)
        else:
            response = requests.post(url, headers=headers, data=data, timeout=30, verify=False)
        response.raise_for_status()
        return BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        print(f"Error requesting {url}: {e}")
        return None

def scrape_state(state_code):
    print(f"Starting scrape for state: {state_code}")
    
    # Step 1: Load main page to get ViewState
    print(f"Requesting {BASE_URL}...")
    soup = get_soup(BASE_URL)
    if not soup:
        return

    form_data = get_viewstate(soup)
    
    # Step 2: Search for the state
    form_data['ddlStates'] = state_code
    form_data['myButton'] = 'Search' 
    
    print("Submitting search...")
    # POST to same URL
    soup = get_soup(BASE_URL, method='POST', data=form_data)
    if not soup:
        return

    # Extract Course Link IDs
    course_ids = set()
    
    links = soup.find_all('a', href=True)
    for link in links:
        href = link['href']
        if 'CourseID=' in href:
            cid = href.split('CourseID=')[1].split('&')[0]
            course_ids.add(cid)
            
    print(f"Found {len(course_ids)} courses on first page.")

    courses_data = []
    
    # For verification, verify first 5
    for i, cid in enumerate(course_ids):
        if i >= 5: break 
        
        detail_url = f"{COURSE_DETAIL_URL}?CourseID={cid}"
        print(f"Scraping course ID: {cid}...")
        detail_soup = get_soup(detail_url)
        if not detail_soup:
            continue
            
        course_name_tag = detail_soup.find('span', id='lblCourseName') or detail_soup.find('span', id='lblFacilityName')
        city_tag = detail_soup.find('span', id='lblCity')
        
        course_name = course_name_tag.text.strip() if course_name_tag else "Unknown"
        city = city_tag.text.strip() if city_tag else "Unknown"
        
        tees = []
        # Try to find the Tee Info table
        # It usually has ID 'gvTeeInfo' or similar
        tee_table = detail_soup.find('table', id='gvTeeInfo')
        if not tee_table:
             # Fallback
             tables = detail_soup.find_all('table')
             for t in tables:
                 if 'Tee Name' in t.text and 'Slope' in t.text:
                     tee_table = t
                     break
        
        if tee_table:
            rows = tee_table.find_all('tr')
            for row in rows:
                cols = row.find_all('td')
                if len(cols) >= 5:
                    try:
                        # Index might vary slightly, but standardizing
                        tee_name = cols[0].text.strip()
                        gender = cols[1].text.strip()
                        par = cols[2].text.strip()
                        rating = cols[3].text.strip()
                        # Sometimes Bogey is in col 4, Slope in 5
                        slope = cols[5].text.strip() if len(cols) > 5 else cols[4].text.strip()
                        
                        if gender in ['M', 'F']: 
                            tees.append({
                                'name': tee_name,
                                'gender': gender,
                                'par': int(par) if par.isdigit() else 72,
                                'rating': float(rating) if rating.replace('.','',1).isdigit() else 0.0,
                                'slope': int(slope) if slope.isdigit() else 113
                            })
                    except Exception:
                        continue

        courses_data.append({
            'id': cid,
            'name': course_name,
            'city': city,
            'state': state_code.replace('US-', ''),
            'tees': tees
        })
        
        time.sleep(1) 

    # Save to file
    output_dir = 'raw_data'
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"{state_code}.json")
    
    with open(output_file, 'w') as f:
        json.dump(courses_data, f, indent=2)
    
    print(f"Saved {len(courses_data)} courses to {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--state', type=str, required=True, help="State code (e.g. US-CA)")
    args = parser.parse_args()
    
    scrape_state(args.state)
