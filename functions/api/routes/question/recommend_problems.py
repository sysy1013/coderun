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
import os

def preprocess_text(text):
    okt = Okt()
    # 숫자 및 특수문자 제거
    text = re.sub(r'\d+', '', text)
    text = re.sub(r'[^\w\s]', '', text)
    # 소문자로 변환
    text = text.lower()
    # 토큰화 및 불용어 제거
    tokens = okt.morphs(text, stem=True)
    stopwords = set([
        '을', '를', '이', '가', '에', '의', '과', '는', '으로', '하다', '에', '것', '이다',
        '그리고', '하지만', '또한', '그래서', '즉', '또', '그러나', '때문에', '위해', '더', '까지',
        '에서', '한', '들', '의해', '하며', '가진', '안', '하고', '것은', '다', '고', '한'
    ])
    tokens = [token for token in tokens if token not in stopwords]
    return ' '.join(tokens)

def load_problems_from_csv(file_path):
    df = pd.read_csv(file_path)
    problems = df.to_dict('records')  # 문제 ID와 텍스트를 포함하는 사전으로 변환
    for problem in problems:
        problem['text'] = preprocess_text(problem['text'])
    return problems

def get_bert_embeddings(texts):
    tokenizer = BertTokenizer.from_pretrained('bert-base-multilingual-cased')
    model = BertModel.from_pretrained('bert-base-multilingual-cased')
    
    embeddings = []
    for text in texts:
        inputs = tokenizer(text, return_tensors='pt', padding=True, truncation=True, max_length=512)
        outputs = model(**inputs)
        cls_embedding = outputs.last_hidden_state[:, 0, :].detach().numpy()
        embeddings.append(cls_embedding)
    return np.vstack(embeddings)  # 2차원 배열로 변환

def recommend_problems(user_problem_text, topic_problems):
    # BERT 임베딩 추출
    all_texts = [user_problem_text] + [problem['text'] for problem in topic_problems]
    
    print("Texts for embeddings:")
    for text in all_texts:
        print(text)
    
    embeddings = get_bert_embeddings(all_texts)
    
    user_embedding = embeddings[0].reshape(1, -1)  # 2차원 배열로 변환
    problem_embeddings = embeddings[1:]
    
    # 코사인 유사도 계산
    cosine_sim = cosine_similarity(user_embedding, problem_embeddings)
    print("Cosine similarity:", cosine_sim, file=sys.stderr)

    # 유사도 점수 확인
    sim_scores = list(enumerate(cosine_sim[0]))
    print("Similarity scores:", sim_scores, file=sys.stderr)
    
    # 가장 높은 유사도 값을 갖는 인덱스 찾기
    recommended_index = np.argmax(cosine_sim[0])
    print(f"Recommended index: {recommended_index}", file=sys.stderr)

    return topic_problems[recommended_index]['id'], topic_problems[recommended_index]['text']

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python recommend_problems.py <user_problem_text> <csv_file_path>", file=sys.stderr)
        sys.exit(1)

    user_problem_text = sys.argv[1]
    csv_file_path = sys.argv[2]
    topic_problems = load_problems_from_csv(csv_file_path)

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", FutureWarning)
        recommended_problem_id, recommended_problem_text = recommend_problems(user_problem_text, topic_problems)

    result = {
        "recommended_problem_id": recommended_problem_id,
        "recommended_problem_text": recommended_problem_text
    }

    print(json.dumps(result, ensure_ascii=False))
    
    # CSV 파일 삭제
    if os.path.exists(csv_file_path):
        os.remove(csv_file_path)
    else:
        print(f"File not found: {csv_file_path}", file=sys.stderr)
