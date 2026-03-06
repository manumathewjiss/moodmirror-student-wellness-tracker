import os
import sys
import streamlit as st
import plotly.graph_objects as go

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from src.model_inference import load_roberta_3class_predictor

st.set_page_config(
    page_title="MoodMirror",
    page_icon="😊",
    layout="centered",
    initial_sidebar_state="collapsed"
)

st.markdown("""
    <style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        text-align: center;
        color: #1f77b4;
        margin-bottom: 2rem;
    }
    .prediction-box {
        padding: 1rem;
        border-radius: 0.5rem;
        background-color: #f0f2f6;
        margin: 1rem 0;
    }
    .emotion-positive {
        color: #28a745;
        font-weight: bold;
        font-size: 1.2rem;
    }
    .emotion-negative {
        color: #dc3545;
        font-weight: bold;
        font-size: 1.2rem;
    }
    .emotion-neutral {
        color: #ffc107;
        font-weight: bold;
        font-size: 1.2rem;
    }
    </style>
""", unsafe_allow_html=True)


@st.cache_resource
def load_model():
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    try:
        predictor = load_roberta_3class_predictor(base_path)
        return predictor
    except Exception as e:
        st.error(f"Error loading model: {str(e)}")
        return None


def get_emotion_color(emotion):
    if emotion == "positive":
        return "emotion-positive"
    elif emotion == "negative":
        return "emotion-negative"
    else:
        return "emotion-neutral"


def get_emotion_value(emotion):
    emotion_map = {"negative": 0, "neutral": 1, "positive": 2}
    return emotion_map.get(emotion, 1)


def main():
    
    st.markdown('<h1 class="main-header">😊 MoodMirror</h1>', unsafe_allow_html=True)
    st.markdown("---")
    
    predictor = load_model()
    if predictor is None:
        st.error("Failed to load model. Please check model files.")
        return
    
    if 'predictions' not in st.session_state:
        st.session_state.predictions = []
    if 'input_count' not in st.session_state:
        st.session_state.input_count = 0
    if 'show_additional_inputs' not in st.session_state:
        st.session_state.show_additional_inputs = False
    
    st.markdown("### 📝 Enter Your Text")
    
    text_input_1 = st.text_area(
        "Text Input 1",
        height=100,
        placeholder="Enter your text here...",
        key="input_1"
    )
    
    if st.button("🔮 Predict Emotion", type="primary", use_container_width=True):
        if text_input_1.strip():
            with st.spinner("Predicting emotion..."):
                try:
                    text_to_predict = text_input_1.strip()
                    emotion, confidence = predictor.predict(text_to_predict)
                    st.session_state.predictions.append({
                        'text': text_to_predict,
                        'emotion': emotion,
                        'input_number': 1,
                        'confidence': confidence
                    })
                    st.session_state.input_count = 1
                    st.session_state.show_additional_inputs = True
                    st.rerun()
                except Exception as e:
                    st.error(f"Error during prediction: {str(e)}")
                    import traceback
                    st.code(traceback.format_exc())
        else:
            st.warning("Please enter some text first.")
    
    if len(st.session_state.predictions) > 0:
        pred = st.session_state.predictions[0]
        emotion_class = get_emotion_color(pred['emotion'])
        st.markdown(f"""
            <div class="prediction-box">
                <strong>Prediction 1:</strong><br>
                <span class="{emotion_class}">{pred['emotion'].upper()}</span><br>
                <small>Text: "{pred['text'][:100]}{'...' if len(pred['text']) > 100 else ''}"</small>
            </div>
        """, unsafe_allow_html=True)
    
    if st.session_state.show_additional_inputs:
        st.markdown("---")
        st.markdown("### 📝 Enter 3 More Texts")
        
        text_input_2 = st.text_area(
            "Text Input 2",
            height=100,
            placeholder="Enter your second text here...",
            key="input_2"
        )
        
        text_input_3 = st.text_area(
            "Text Input 3",
            height=100,
            placeholder="Enter your third text here...",
            key="input_3"
        )
        
        text_input_4 = st.text_area(
            "Text Input 4",
            height=100,
            placeholder="Enter your fourth text here...",
            key="input_4"
        )
        
        col1, col2 = st.columns([1, 1])
        with col1:
            if st.button("🔮 Predict All", type="primary", use_container_width=True):
                inputs = [text_input_2, text_input_3, text_input_4]
                all_filled = all(inp.strip() for inp in inputs)
                
                if all_filled:
                    with st.spinner("Predicting emotions..."):
                        try:
                            st.session_state.predictions = [st.session_state.predictions[0]]
                            
                            for idx, text in enumerate(inputs, start=2):
                                emotion, confidence = predictor.predict(text.strip())
                                st.session_state.predictions.append({
                                    'text': text.strip(),
                                    'emotion': emotion,
                                    'input_number': idx
                                })
                            
                            st.session_state.input_count = 4
                            st.rerun()
                        except Exception as e:
                            st.error(f"Error during prediction: {str(e)}")
                else:
                    st.warning("Please fill all three text inputs.")
        
        with col2:
            if st.button("🔄 Reset", use_container_width=True):
                st.session_state.predictions = []
                st.session_state.input_count = 0
                st.session_state.show_additional_inputs = False
                st.rerun()
        
        if len(st.session_state.predictions) > 1:
            for pred in st.session_state.predictions[1:]:
                emotion_class = get_emotion_color(pred['emotion'])
                st.markdown(f"""
                    <div class="prediction-box">
                        <strong>Prediction {pred['input_number']}:</strong><br>
                        <span class="{emotion_class}">{pred['emotion'].upper()}</span><br>
                        <small>Text: "{pred['text'][:100]}{'...' if len(pred['text']) > 100 else ''}"</small>
                    </div>
                """, unsafe_allow_html=True)
    
    if len(st.session_state.predictions) == 4:
        st.markdown("---")
        st.markdown("### 📊 Emotion Trend Visualization")
        
        input_numbers = [pred['input_number'] for pred in st.session_state.predictions]
        emotions = [pred['emotion'] for pred in st.session_state.predictions]
        emotion_values = [get_emotion_value(emotion) for emotion in emotions]
        
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=input_numbers,
            y=emotion_values,
            mode='lines+markers',
            name='Emotion Trend',
            line=dict(color='#1f77b4', width=3),
            marker=dict(size=12, color='#1f77b4')
        ))
        
        fig.update_layout(
            title={
                'text': 'Emotion Trend Across 4 Inputs',
                'x': 0.5,
                'xanchor': 'center',
                'font': {'size': 20}
            },
            xaxis=dict(
                title='Input Number',
                tickmode='linear',
                tick0=1,
                dtick=1,
                range=[0.5, 4.5]
            ),
            yaxis=dict(
                title='Emotion',
                tickmode='array',
                tickvals=[0, 1, 2],
                ticktext=['Negative', 'Neutral', 'Positive'],
                range=[-0.2, 2.2]
            ),
            height=500,
            hovermode='x unified',
            template='plotly_white'
        )
        
        for i, (x, y, emotion) in enumerate(zip(input_numbers, emotion_values, emotions)):
            fig.add_annotation(
                x=x,
                y=y,
                text=emotion.upper(),
                showarrow=True,
                arrowhead=2,
                arrowsize=1,
                arrowwidth=2,
                arrowcolor='#666',
                ax=0,
                ay=-40,
                bgcolor='white',
                bordercolor='#666',
                borderwidth=1,
                font=dict(size=10, color='#333')
            )
        
        st.plotly_chart(fig, use_container_width=True)
        
        st.markdown("#### 📈 Summary")
        emotion_counts = {}
        for emotion in emotions:
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Positive", emotion_counts.get('positive', 0))
        with col2:
            st.metric("Neutral", emotion_counts.get('neutral', 0))
        with col3:
            st.metric("Negative", emotion_counts.get('negative', 0))


if __name__ == "__main__":
    main()

