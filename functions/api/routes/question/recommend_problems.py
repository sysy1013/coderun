import sys
import json
import pandas as pd
from transformers import BertTokenizer, BertModel
import torch
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from konlpy.tag import Okt
import re
import warnings

# 전역 변수로 stopwords 설정
stopwords = set([
    '을', '를', '이', '가', '에', '의', '과', '는', '으로', '하다', '에', '것', '이다',
    '그리고', '하지만', '또한', '그래서', '즉', '또', '그러나', '때문에', '위해', '더', '까지',
    '에서', '한', '들', '의해', '하며', '가진', '안', '하고', '것은', '다', '고', '한'
])

# BERT 모델과 토크나이저 전역 로딩
tokenizer = BertTokenizer.from_pretrained('bert-base-multilingual-cased')
model = BertModel.from_pretrained('bert-base-multilingual-cased')

def preprocess_text(text):
    okt = Okt()
    text = re.sub(r'\d+|[^\w\s]', '', text)  # 숫자와 특수 문자 제거를 하나의 표현식으로 합침
    text = text.lower()
    tokens = okt.morphs(text, stem=True)
    tokens = [token for token in tokens if token not in stopwords]
    return ' '.join(tokens)

def get_bert_embeddings(texts):
    embeddings = []
    for text in texts:
        inputs = tokenizer(text, return_tensors='pt', padding=True, truncation=True, max_length=512)
        outputs = model(**inputs)
        cls_embedding = outputs.last_hidden_state[:, 0, :].detach().numpy()
        embeddings.append(cls_embedding)
    return np.vstack(embeddings)

def recommend_problems(user_problem_text, topic_problems):
    all_texts = [user_problem_text] + [problem['similarproblem'] for problem in topic_problems]
    embeddings = get_bert_embeddings(all_texts)
    user_embedding = embeddings[0].reshape(1, -1)
    problem_embeddings = embeddings[1:]
    cosine_sim = cosine_similarity(user_embedding, problem_embeddings)
    #print("Cosine Similarity:", cosine_sim)
    recommended_index = np.argmax(cosine_sim[0])
    return topic_problems[recommended_index]

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: <user_problem_text> <similar_problems_json>", file=sys.stderr)
        sys.exit(1)

    user_problem_text = sys.argv[1]
    similar_problems_json_path = sys.argv[2]

    with open(similar_problems_json_path, 'r', encoding='utf-8') as f:
        topic_problems = json.load(f)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        recommended_problem = recommend_problems(user_problem_text, topic_problems)

    result = {
        "recommended_problem_text": recommended_problem['similarproblem'],
        "recommended_problem_solution" : recommended_problem['solution'],
        "recommded_problem_result" : recommended_problem['result']
    }

    print(json.dumps(result, ensure_ascii=False))
