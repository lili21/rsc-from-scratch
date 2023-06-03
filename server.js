import { readFile } from 'fs/promises';
import { createServer } from 'http';
import escapeHtml from 'escape-html';

function BlogPostPage({ postContent, children }) {
  return (
    <html>
      <head>
        <title>My Blog</title>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <hr />
        </nav>
        <article>
          {postContent}
        </article>
        {children}
      </body>
    </html>
  )
}

function Footer({ author }) {
  return (
    <footer>
      <hr />
      <p>
        <i>(c) ${author}, ${new Date().getFullYear()}</i>
      </p>
    </footer>
  )
}

createServer(async (req, res) => {
  const author = "Jae Doe";
  const postContent = await readFile("./posts/hello-world.txt", "utf-8");

  sendHTML(
    res,
    <BlogPostPage postContent={postContent}><Footer author={author} /></BlogPostPage>
  )
}).listen(8080);

function sendHTML(res, jsx) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(renderJSXToHTML(jsx));
}

function renderJSXToHTML(jsx) {
  // let html = '';
  if (typeof jsx === 'string' || typeof jsx === 'number') {
    return escapeHtml(jsx);
  } else if (jsx === null || typeof jsx === 'boolean') {
    return '';
  } else if (Array.isArray(jsx)) {
    return jsx.map(child => renderJSXToHTML(child)).join('');
  } else if (typeof jsx === 'object') {
    // vdom
    if (jsx.$$typeof === Symbol.for('react.element')) {
      if (typeof jsx.type === 'function') {
        const Component = jsx.type;
        return renderJSXToHTML(Component(jsx.props));
      }
      // tag
      let html = `<${jsx.type}`;
      // props
      Object.keys(jsx.props).filter(k => k !== 'children').forEach(k => {
        html += ` ${k}=${jsx.props[k]}`;
      });
      html += `>`;
      // children
      if (jsx.props.children) {
        html += renderJSXToHTML(jsx.props.children);
      }
      html += `</${jsx.type}>`;
      return html;
    } else {
      throw new Error('Connot render an object.');
    }
  } else {
    throw new Error('Not implemented.')
  }
}
