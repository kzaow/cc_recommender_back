from urllib.parse import urlparse, urlunparse, parse_qs,parse_qsl,urlencode
from bs4 import BeautifulSoup
from time import sleep
import requests
import re
import json
import logging
import psycopg2
from db import db


def get_all_cards(url):
    page_counter = 0
    max_page = 0
    while True:
        page_counter = page_counter + 1
        scheme, netloc, path, params, query, fragment = urlparse(url)
        url = urlunparse((scheme,netloc,path,params,'',fragment))
        q_params = dict(parse_qsl(query))
        
        q_params['page'] = page_counter
        response = requests.get(url,q_params)
        current_params = dict(parse_qsl(urlparse(response.url).query))
        
        cards,max_page = get_credit_card_info(response)
        if cards == None:
            logging.debug('End of cards for this feature\n Moving on.')
            break
        if page_counter == max_page:
            break
        cards_info = get_comment_links(cards)
        
        grab_all_comments(cards_info)
        print(len(REVIEWS))
        sleep(5)


def get_credit_card_info(response):
    html = BeautifulSoup(response.text.encode('utf-8','ignore'),'html.parser')
    cards = html.find_all('div',{'class':'name-and-review-container'})
    pages = html.find_all('a',{'class':'page-link'})
    max_page = 0
    if not pages:
        max_page = 1
    else:
        pages = [page.text for page in pages]
        max_page = max(pages)
    return cards,int(max_page)

def card_in_database(cards):
    if db_connec.has_card(card_name):
        db_connec.insert_comments()
def get_comment_links(cards):
    return [get_comment_link(card) for card in cards]
def get_comment_link(card):
    card_name = remove_non_alpha(card.h3.text)
    review_link = card.a['href']
    if card_name in CARD_MATCH_DICT.keys():
        if CARD_DICT[CARD_MATCH_DICT[card_name]]['haveReviews']:
            return None
    if card_name_is_valid(card_name.lower()):
        return (card_name,review_link)
    else:
        return None

def card_found(card_name,card_names):
    return card_name in card_names
def match_cards(card_name,card_name_cp):
    CARD_MATCH_DICT[card_name] = card_name_cp
    CARD_DICT[card_name_cp]['haveReviews'] = True
def card_name_is_valid(card_name):
    card_name_cp = card_name
    card_names = CARD_DICT.keys()
    if card_found(card_name_cp,card_names):
        match_cards(card_name,card_name_cp)
        return True
    for issuer in ISSUERS:
        card_name_cp = card_name_cp.replace(issuer,'').strip()
    if card_found(card_name_cp,card_names):
        match_cards(card_name,card_name_cp)
        return True
    card_name_cp = card_name_cp.replace('credit card','').strip()
    if card_found(card_name_cp,card_names):
        match_cards(card_name,card_name_cp)
        return True
    card_name = card_name.replace('card','').strip()
    if card_found(card_name_cp,card_names):
        return True
    for name in card_names:
        if card_name_cp in name or name in card_name_cp:
            match_cards(card_name,name)
            return True
    return False
       
def remove_non_alpha(string):
    return re.sub('[^0-9a-zA-Z\s-]+', '', string)

def grab_all_comments(cards):
    for card in cards:
        if card is None:
            continue
        grab_json(*card)
        sleep(2)
def grab_json(card_id,link):
    if link is None:
        return
    paths = link.split('/')
    name = paths[5]
    print(name)
    parameters['streamID'] = name
    parameters['start']=""
    has_more =True
    while has_more:
        response = requests.get(SEARCH_ENDPOINT,parameters)
        json_dict = json.loads(response.text)
        has_more = json_dict['hasMore']
        parameters['start'] = json_dict['next']
        grab_comments(json_dict)
        sleep(3)
def grab_comments(json_dict):
    comments = json_dict['comments']
    comment_count = 0
    for comment in comments:
        title = comment['commentTitle']
        rating = comment['ratings']['_overall']
        text = comment['commentText']
        card_name = comment['streamId']
        review_id = comment['ID']
        REVIEWS.append((review_id,title,text,rating,card_id))
        print(title)
        global COUNT 
        COUNT= COUNT +1
        print(COUNT)

def get_cards():
    database = db()
    cards = database.get_cards()

    card_dict = {card[0]:card[5] for card in cards}
    return card_dict
def get_issuers():
    database = db()
    issuers = database.get_issuers()
    return issuers
def read_urls_from_file(file_name):
    lines = []
    with open(file_name) as file:
        for line in file:
            line = line.strip()
            lines.append(line) 
    return lines  

CARD_DICT ={}
REVIEWS = []
COUNT = 0
SEARCH_ENDPOINT = 'https://comments.us1.gigya.com/comments.getComments'
parameters = {'categoryID':'Credit Card Reviews','streamID':'','includeSettings':'true','start':'','threaded':'true','includeUserOptions':'true','includeUserHighlighting':'true','lang':'en','ctag':'comments_v2','APIKey':'3_nEOgyOAixczyQ52gL0vTNtBFexwEVaGBfdflwNtYp9x_0o9Q8WSmqMq352XCLrIa','cid':'','source':'showCommentsUI','sdk':'js_7.1.2','format':'json','callback':'gigya._.apiAdapters.web.callback','authMode':'cookie'}
CARD_DICT = get_cards()
for card_id,link in CARD_DICT.items():
    print(link)
    grab_json(card_id,link)





