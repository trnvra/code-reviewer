import { useState } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css';
import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import axios from 'axios';
import './App.css';

// Fix: Agar default export issue hai, toh hum use manually handle karenge
const CodeEditor = Editor.default || Editor;

function App() {
  const [code, setCode] = useState(`function sum() {\n  return 1 + 1\n}`);

  const [ review, setReview ] = useState(``)

  async function reviewCode() {

    const response = await axios.post('https://code-reviewer-s0ya.onrender.com/ai/get-review', { code })

    setReview(response.data)

  }
  return (
    <main>
      <div className="left">
        <div className="code">
          <CodeEditor
            value={code}
            onValueChange={code => setCode(code)}
            highlight={code => Prism.highlight(code, Prism.languages.javascript, 'javascript')}
            padding={10}
            style={{
              fontFamily: '"Fira code", "Fira Mono", monospace',
              fontSize: 16,
              border: "1px solid #ddd",
              borderRadius: "5px",
              height: "100%",
              width: "100%",
              backgroundColor: "#2d2d2d"
            }}
          />
        </div>
        <div
          onClick={reviewCode}
          className="review">Review</div>
      </div>
      <div className="right">
        <Markdown
           
          rehypePlugins={[ rehypeHighlight ]}

        >{review}</Markdown>
      </div>
    </main>
  );
}

export default App;