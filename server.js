import { readFile, readdir } from 'fs/promises';
import { createServer } from 'http';
import escapeHtml from 'escape-html';

function BlogLayout({ children }) {
  const author = "Jae Doe";

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
        <input />
        <main>
          {children}
        </main>
        <Footer author={author} />
      </body>
    </html>
  )
}

async function BlogIndexPage() {
  const postFiles = await readdir('./posts');
  const postSlugs = postFiles.map(file => file.slice(0, file.lastIndexOf('.')));
  return (
    <section>
      <h1>Welcome to my blog</h1>
      <div>
        {
          postSlugs.map((postSlug) => (
            <section key={postSlug}>
              <h2>
                <a href={`/${postSlug}`}>{postSlug}</a>
              </h2>
              <Post postSlug={postSlug} />
            </section>
          ))
        }
      </div>
    </section>
  )
}

function BlogPostPage({ postSlug }) {
  return (
    <section>
      <h2>
        <a href={`/${postSlug}`}>{postSlug}</a>
      </h2>
      <Post postSlug={postSlug} />
    </section>
  )
}

async function Post({ postSlug }) {
  const postContent = await readFile(`./posts/${postSlug}.txt`, 'utf8');
  return <article>{postContent}</article>
}

function Footer({ author }) {
  return (
    <footer>
      <hr />
      <p>
        <i>(c) {author}, {new Date().getFullYear()}</i>
      </p>
    </footer>
  )
}

function Route({ url }) {
  let page;
  if (url.pathname === '/') {
    page = <BlogIndexPage />;
  } else if (!url.pathname.includes('.')) {
    page = <BlogPostPage postSlug={url.pathname.slice(1)} />;
  }

  if (page) {
    return <BlogLayout>{page}</BlogLayout>;
  } else {
    res.writeHead(404);
    res.end();
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/client.js') {
    // js
    const content = await readFile(`.${url.pathname}`);
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(content);
  } else if (!url.pathname.includes('.')) {
    if (url.searchParams.has('jsx')) {
      url.searchParams.delete('jsx');
      sendJSX(res, <Route url={url} />)
    } else {
      sendHTML(res, <Route url={url} />);
    }
  }
}).listen(8080);

async function sendHTML(res, jsx) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  let html = await renderJSXToHTML(jsx);
  const clientJSXString = await renderJSXToJSXString(jsx);
  html += `<script>window.__CLIENT_JSX__ = `;
  html += JSON.stringify(clientJSXString);
  html += `</script>`;
  html += `
      <script type="importmap">
        {
          "imports": {
            "react": "https://esm.sh/react@canary",
            "react-dom/client": "https://esm.sh/react-dom@canary/client"
          }
        }
      </script>
      <script type="module" src="/client.js"></script>
    `;
  res.end(html);
}

async function renderJSXToHTML(jsx) {
  // let html = '';
  if (typeof jsx === 'string' || typeof jsx === 'number') {
    return escapeHtml(jsx);
  } else if (jsx === null || typeof jsx === 'boolean') {
    return '';
  } else if (Array.isArray(jsx)) {

    const childHtmls = await Promise.all(
      jsx.map((child) => renderJSXToHTML(child))
    );
    let html = "";
    let wasTextNode = false;
    let isTextNode = false;
    for (let i = 0; i < jsx.length; i++) {
      isTextNode = typeof jsx[i] === "string" || typeof jsx[i] === "number";
      if (wasTextNode && isTextNode) {
        html += "<!-- -->"; // magic part. 不然hydrate会失败
      }
      html += childHtmls[i];
      wasTextNode = isTextNode;
    }
    return html;
  } else if (typeof jsx === 'object') {
    // vdom
    if (jsx.$$typeof === Symbol.for('react.element')) {
      if (typeof jsx.type === 'function') {
        return renderJSXToHTML(await jsx.type(jsx.props));
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
        html += await renderJSXToHTML(jsx.props.children);
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

async function sendJSX(res, jsx) {
  const jsxString = await renderJSXToJSXString(jsx);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(jsxString);
}

async function renderJSXToJSXString(jsx) {
  const resultJSX = await renderJSXToClientJSX(jsx);
  const jsxString = JSON.stringify(resultJSX, (key, value) => {
    if (value === Symbol.for('react.element')) {
      return '$RE'
    } else {
      return value;
    }
  })
  return jsxString;
}

async function renderJSXToClientJSX(jsx) {
  if (typeof jsx === 'string' || typeof jsx === 'number' || jsx == null || typeof jsx === 'boolean') {
    return jsx;
  } else if (Array.isArray(jsx)) {
    return await Promise.all(jsx.map(async child => await renderJSXToClientJSX(child)));
  } else if (typeof jsx === 'object') {
    // vdom
    if (jsx.$$typeof === Symbol.for('react.element')) {
      if (typeof jsx.type === 'function') {
        return renderJSXToClientJSX(await jsx.type(jsx.props));
      }
      return {
        ...jsx,
        props: {
          ...jsx.props,
          children: await renderJSXToClientJSX(jsx.props.children)
        }
      }
    } else {
      console.log(jsx);
      throw new Error('Connot render an object.');
    }
  } else {
    throw new Error('Not implemented.')
  }
}
