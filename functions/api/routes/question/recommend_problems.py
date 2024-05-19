import sys
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def recommend_problems(user_problem_text, topic_problems):
    # TF-IDF 벡터화
    tfidf_vectorizer = TfidfVectorizer()
    tfidf_matrix = tfidf_vectorizer.fit_transform([problem['text'] for problem in topic_problems])

    # 사용자 문제의 TF-IDF 벡터화
    user_problem_vector = tfidf_vectorizer.transform([user_problem_text])
    
    # 코사인 유사도 계산
    cosine_sim = cosine_similarity(user_problem_vector, tfidf_matrix)

    # 유사도 점수 확인
    sim_scores = list(enumerate(cosine_sim[0]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    
    # 유사도 점수 출력 (디버깅용)
    #print("Similarity Scores:", sim_scores)

    # 가장 유사한 문제 선택
    recommended_index = sim_scores[1][0]  # 자기 자신 제외
    return topic_problems[recommended_index]

if __name__ == "__main__":
    user_problem_text = sys.argv[1]
    topic_problems_json = sys.argv[2]
    topic_problems = json.loads(topic_problems_json)

    recommended_problem = recommend_problems(user_problem_text, topic_problems)
    print(json.dumps(recommended_problem))
