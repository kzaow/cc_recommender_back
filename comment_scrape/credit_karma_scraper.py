from urllib.parse import urlparse, urlunparse, parse_qs,parse_qsl,urlencode
from time import sleep
from db import db
import requests
import re
import json
import logging
import psycopg2
from selenium import webdriver
from selenium.webdriver.support.ui import Select
from bs4 import BeautifulSoup
from pyvirtualdisplay import Display
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
import lxml.html



ENDPOINT = 'https://www.creditkarma.com'
url2 = 'https://www.creditkarma.com/reviews/credit-card/single/id/coCash?pg=2&pgsz=10'
url = 'https://www.creditkarma.com/reviews/credit-card/single/id/coCash#single-review-listing'

def grab_all_reviews(url,card_id):
    resp = requests.get(url,PARAMETERS)
    code = BeautifulSoup(resp.text.encode('utf-8','ignore'),'html.parser')
    pagination_element = code.find('td',{'class':'pagination-right'})
    last_page = None
    if pagination_element is None: 
        return       
    last_page = int(code.find('td',{'class':'pagination-right'}).find_all('b')[1].text)
    current_page = 0
    
    while current_page < last_page:
        current_page = current_page + 1
        PARAMETERS['pg'] = current_page  
        response = requests.get(url,PARAMETERS)
        html = BeautifulSoup(response.text,'html5lib')
        reviews = html.find_all('div',{'class':'review'})
        titles = html.find_all('h5',{'class':'review-title'})
        review_count = 0
        for review in reviews:
            
            review_count = review_count + 1
            rating = review.find('span').get('ck-stars').split()[0]
            review_str = str(review)
            start = review_str.find('review-title')
            end = review_str.find('</h5')
            title = ''
            if start !=-1 and end!=-1:
                title_list = review_str[start:end].split('\n')
                title = title_list[1].strip()
            
          
            text = review.find('div',{'class':'readmoreInner'})
            paragraphs = text.find_all('p')
            review_text = '\n\n'.join([paragraph.text for paragraph in paragraphs])
            print(rating,'\n',title,'\n',review_text,'\n')
            REVIEWS.append(('',title,review_text,rating,card_id))
            
        print(len(REVIEWS))
        
        sleep(3)
def parse_page(html):
    soup = BeautifulSoup(requests.get(href).text, 'html.parser')
    reviews = soup.find_all('div', {'class': 'review'})

    count = 0
    for review in reviews:
    	count = count+1
    	sstars = review.find_all('span')[0]['ck-stars'].split()[0]
    	review_title = review.find('h5',{'class':'review-title'}).text
    	review_text = review.find('div', {'class': 'readmoreInner'}).p.text
    	print(review_text + '\n\n')
def get_cards():
    database = db()
    cards = database.get_cards()
    card_dict = {card[0]:card[6] for card in cards}
    return card_dict
#href = get_code(url)
CARD_DICT = get_cards()
PARAMETERS = {'pg':'1','pgsz':'10'}
REVIEWS = []
COUNT = 0
for card_id,url in CARD_DICT.items():
    if url is None:
        continue
    print('grabbing reviews for card # {}'.format(card_id))
    print(url)
    grab_all_reviews(url,card_id)
    sleep(7)
    
database = db()
print(len(REVIEWS))
database.insert_reviews(REVIEWS)
