import sys
import json
import re
from konlpy.tag import Okt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# 간단한 한국어 불용어 리스트
korean_stopwords = [
    "이", "그", "저", "것", "수", "등", "들", "및", "의", "있", "하", "않", "되", "을", "를", "에", "과", "와",
    "은", "는", "로", "가", "로서", "로써", "도", "가장", "다른", "어떤", "다", "하다"
]

# Initialize the Okt object
okt = Okt()

def preprocess_text(text):
    if not isinstance(text, str):
        return ""
    # Convert text to lowercase (though this may not affect Korean)
    text = text.lower()
    # Replace newlines with spaces
    text = text.replace('\n', ' ')
    # Remove special characters (keeping only Korean, numbers, and spaces)
    text = re.sub(r'[^ㄱ-ㅎ가-힣0-9\s]', '', text)
    # Tokenize and remove stopwords
    tokens = okt.morphs(text)
    tokens = [word for word in tokens if word not in korean_stopwords]
    return ' '.join(tokens)

def recommend_problems(user_problem_text, topic_problems):
    print("Original User Text:", user_problem_text, file=sys.stderr)
    
    if user_problem_text == "undefined":
        return {"error": "User problem text is undefined."}
    
    user_problem_text = preprocess_text(user_problem_text)
    print("Preprocessed User Text:", user_problem_text, file=sys.stderr)
    
    # Check if user_problem_text is empty
    if not user_problem_text.strip():
        return {"error": "User problem text is empty after preprocessing."}
    
    for problem in topic_problems:
        print("Original Problem Text:", problem['text'], file=sys.stderr)
        problem['text'] = preprocess_text(problem['text'])
        print("Preprocessed Problem Text:", problem['text'], file=sys.stderr)

    # Using TfidfVectorizer with adjusted parameters
    tfidf_vectorizer = TfidfVectorizer(ngram_range=(1, 3), max_df=0.95, min_df=1, max_features=5000)
    tfidf_matrix = tfidf_vectorizer.fit_transform([problem['text'] for problem in topic_problems])
    user_problem_vector = tfidf_vectorizer.transform([user_problem_text])

    cosine_sim = cosine_similarity(user_problem_vector, tfidf_matrix)
    sim_scores = list(enumerate(cosine_sim[0]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    print("Similarity Scores:", sim_scores, file=sys.stderr)

    if len(sim_scores) > 1 and sim_scores[1][1] > 0:
        recommended_index = sim_scores[1][0]
    elif len(sim_scores) > 0 and sim_scores[0][1] > 0:
        recommended_index = sim_scores[0][0]
    else:
        return {}

    return topic_problems[recommended_index]

if __name__ == "__main__":
    # Check if correct number of arguments are passed
    if len(sys.argv) < 3:
        print("Error: Insufficient arguments provided.", file=sys.stderr)
        sys.exit(1)
    
    user_problem_text = sys.argv[1]
    topic_problems_json = sys.argv[2]
    
    # Check if arguments are empty
    if not user_problem_text or not topic_problems_json:
        print("Error: One or more arguments are empty.", file=sys.stderr)
        sys.exit(1)
    
    topic_problems = json.loads(topic_problems_json)

    recommended_problem = recommend_problems(user_problem_text, topic_problems)
    print(json.dumps(recommended_problem))
