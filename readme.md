# 제주대학교 컴퓨터교육과 캡스톤 디자인 1

## 맞춤형 학습 지원 시스템

### 상세 기능 설명

1. **라이브러리 임포트 및 전역 변수 설정**
   - 다양한 라이브러리 사용: `pandas`, `transformers`, `torch`, `numpy`, `sklearn` 등을 활용합니다.
   - 불용어 리스트를 사용해 텍스트에서 불필요한 단어를 제거합니다.

   ```python
   import pandas as pd
   import torch
   import numpy as np
   from transformers import BertTokenizer, BertModel
   from sklearn.metrics.pairwise import cosine_similarity
   from konlpy.tag import Okt
   
   stopwords = ['을', '를', '이', '가', '은', '는']
   tokenizer = BertTokenizer.from_pretrained('bert-base-multilingual-cased')
   model = BertModel.from_pretrained('bert-base-multilingual-cased')
   okt = Okt()
   ```

2. **BERT 모델 및 토크나이저 로드**
   - `BertTokenizer`와 `BertModel`을 미리 로드하여 전역적으로 사용합니다.
   - `bert-base-multilingual-cased` 모델을 사용해 다국어 텍스트에 대한 임베딩을 생성합니다.

3. **전처리 함수 (`preprocess_text`)**
   - 한국어 텍스트를 전처리하는 함수입니다.
   - `konlpy` 라이브러리의 `Okt` 형태소 분석기를 이용하여 텍스트를 분석합니다.
   - 숫자와 특수 문자를 제거하고, 불용어를 필터링한 후, 소문자로 변환하여 처리합니다.

   ```python
   def preprocess_text(text):
       text = ''.join([char for char in text if char.isalnum() or char.isspace()])
       tokens = okt.morphs(text)
       tokens = [word for word in tokens if word not in stopwords]
       return ' '.join(tokens).lower()
   ```

4. **BERT 임베딩 생성 함수 (`get_bert_embeddings`)**
   - 입력된 텍스트 리스트에 대해 BERT 모델을 이용하여 임베딩을 생성합니다.
   - `[CLS]` 토큰의 임베딩을 사용해 각 텍스트의 벡터 표현을 추출합니다.

   ```python
   def get_bert_embeddings(text_list):
       inputs = tokenizer(text_list, return_tensors='pt', padding=True, truncation=True)
       with torch.no_grad():
           outputs = model(**inputs)
       cls_embeddings = outputs.last_hidden_state[:, 0, :]
       return cls_embeddings
   ```

5. **문제 추천 함수 (`recommend_problems`)**
   - 사용자 문제와 주제 관련 문제들의 텍스트를 입력받아, 임베딩을 생성하고 코사인 유사도를 계산합니다.
   - 유사도가 가장 높은 문제를 사용자에게 추천합니다.

   ```python
   def recommend_problems(user_problem, related_problems):
       user_embedding = get_bert_embeddings([user_problem])
       related_embeddings = get_bert_embeddings(related_problems)
       similarities = cosine_similarity(user_embedding, related_embeddings)[0]
       most_similar_idx = np.argmax(similarities)
       return related_problems[most_similar_idx]
   ```

6. **메인 실행 부분**
   - 사용자 문제 텍스트와 JSON 형식의 유사 문제들을 입력받아, 가장 유사한 문제를 추천합니다.

   ```python
   if __name__ == "__main__":
       user_problem = "사용자가 입력한 문제 텍스트"
       related_problems = ["유사 문제 1", "유사 문제 2", "유사 문제 3"]
       recommended_problem = recommend_problems(user_problem, related_problems)
       print(f"추천된 문제: {recommended_problem}")
   ```

### 시스템의 주요 특징
- **다양한 라이브러리 지원**: 고급 텍스트 분석을 위해 여러 라이브러리를 조합하여 사용합니다.
- **다국어 지원**: `bert-base-multilingual-cased` 모델을 사용하여 다양한 언어의 텍스트를 처리할 수 있습니다.
- **맞춤형 문제 추천**: 사용자의 입력에 기반해 가장 관련성이 높은 문제를 제시하여 학습 효율을 높입니다.

이 시스템은 사용자의 개별 학습 요구에 맞춰 문제를 추천하고, 맞춤형 학습을 지원하는 것을 목표로 합니다. 직관적이고 사용자 친화적인 기능을 통해 학습의 질을 향상시킬 수 있습니다.
