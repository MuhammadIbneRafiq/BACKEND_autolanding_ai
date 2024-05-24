from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time

# Set up Selenium WebDriver
options = webdriver.ChromeOptions()
options.add_argument('--headless')  # Run in headless mode for no GUI
driver = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=options)

# # URL of the Fiverr profile
url = "https://www.fiverr.com/laithabbadi"

# # Load the webpage
# print("Loading the webpage...")
driver.get(url)
# time.sleep(5)  # Wait for the page to fully load

# # Get the page source and parse it with BeautifulSoup
page_source = driver.page_source
# print("Page source retrieved, length:", len(page_source))

# Create BeautifulSoup object
soup = BeautifulSoup(page_source, 'html.parser')
print("BeautifulSoup object created")



# Function to extract job descriptions and reviews
def extract_profile_info(soup):
    # Extract job descriptions
    jobs = []
    gig_cards = soup.find_all('div', class_='gig-card-layout')
    print(f"Found {len(gig_cards)} gig cards")
    for index, job in enumerate(gig_cards):
        print(f"Processing gig card {index + 1}/{len(gig_cards)}")
        title_tag = job.find('h3')
        description_tag = job.find('p')
        if title_tag:
            print(f"Title found: {title_tag.text.strip()}")
        else:
            print("Title tag not found")

        if description_tag:
            print(f"Description found: {description_tag.text.strip()}")
        else:
            print("Description tag not found")

        if title_tag and description_tag:
            title = title_tag.text.strip()
            description = description_tag.text.strip()
            jobs.append({'title': title, 'description': description})
        else:
            print("Title or description tag not found in this gig card")

    # Extract reviews
    reviews = []
    review_contents = soup.find_all('div', class_='review-content')
    print(f"Found {len(review_contents)} review contents")
    for index, review in enumerate(review_contents):
        print(f"Processing review content {index + 1}/{len(review_contents)}")
        rating_tag = review.find('div', class_='rating')
        review_text_tag = review.find('p', class_='review-comment')
        
        if rating_tag:
            print(f"Rating found: {rating_tag.text.strip()}")
        else:
            print("Rating tag not found")

        if review_text_tag:
            print(f"Review text found: {review_text_tag.text.strip()}")
        else:
            print("Review text tag not found")

        if rating_tag and review_text_tag:
            rating = rating_tag.text.strip()
            review_text = review_text_tag.text.strip()
            reviews.append({'rating': rating, 'review': review_text})
        else:
            print("Rating or review text tag not found in this review content")

    print("Jobs extracted:", jobs)
    print("Reviews extracted:", reviews)
    return jobs, reviews


print([(s) for s in soup][0] )
# extract_profile_info(soup)
# Extract the info
# job, revieW = extract_profile_info(soup)

# print(job, revieW)

driver.quit()
print("WebDriver closed")