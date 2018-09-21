from db import db
import requests
import indicoio
from time import sleep
import json


to_remove = ['\n','\t','<div>','<br />','</div>','</span>','<span>','<p>','</p>','<p lang=\"en\">','<span lang=\"EN\">','<span class=\"s1\">','<span class=\"stepsHeader\">','<span class=\"listAmount floatRight\">','</>','<>']

indicoio.config.api_key = 'dac323277af6c9a5068796fb9df62acb'


database = db()

revs = database.check_reviews()
count = 0
output_dict = {}
sentence_list = []
output_file = 'output.txt'
def save_to_json(i):
    with open('sentiment_results3.json','w') as fp:
        json.dump(output_dict,fp)
        print('saving',i)
for r in revs:
    sentences = r[3].split('.')
    sentences = [sentence for sentence in sentences if sentence]
    count = count + len(sentences)
    for sentence in sentences:
        sentence = sentence.replace('\u2019',"'")
        sentence = sentence.replace('div',"")
        for expr in to_remove:
            sentence  = sentence.replace(expr,'')
        sentence = sentence.strip()
        sentence = ''.join([i if ord(i) < 128 else ' ' for i in sentence])
        sentence_list.append(sentence)
print(len(sentence_list))

index = 0
for i in range(0,len(sentence_list),12):
    sentencez = sentence_list[i-30:i]
    sentencez = [sentence for sentence in sentencez if sentence]
    
    result = None
    try:
        result = indicoio.sentiment_hq(sentencez)
        for x in range(len(result)):
            output_dict[sentencez[x]] = result[x]
        if i%90 ==0:
            save_to_json(i)
        sleep(3)
    except:
        continue
   

save_to_json(0)


