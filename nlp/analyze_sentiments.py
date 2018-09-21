import json
from db import db
from time import sleep
import numpy as np
file_name = 'sentiments.json'
def load_json(file_name):
    with open(file_name) as json_data:
        return json.load(json_data)
def save_to_json(output_dict):
    with open('sentiment_averages.json','w') as fp:
        json.dump(output_dict,fp)

sentiments = load_json('sentiments.json')
words = load_json('words.json')
ratings_dict = {}
average_ratings_dict = {}


database = db()
count = database.get_card_count()

for i in range(0,count[0] +1):
    ratings_dict[i] = {}
    average_ratings_dict[i] = {}
    for key in words.keys():
        ratings_dict[i][key] =[]
        average_ratings_dict[i][key] =[]
        


for k,v in sentiments.items():
    for word in k.split():
        for key,keyword_list in words.items():
            if word in keyword_list:
                ratings_dict[v['card_id']][key].append(v['rating'])

for k,v in ratings_dict.items():
    for key,val in v.items():
        average_ratings_dict[k][key] = np.array(val).mean()

save_to_json(average_ratings_dict)
