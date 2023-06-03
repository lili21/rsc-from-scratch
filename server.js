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
        <main>
          {children}
        </main>
        <Footer author={author} />
      </body>
    </html>
  )
}

function BlogIndexPage({ postSlugs }) {
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
        <i>(c) ${author}, ${new Date().getFullYear()}</i>
      </p>
    </footer>
  )
}

createServer(async (req, res) => {
  // const author = "Jae Doe";
  // const postContent = await readFile("./posts/hello-world.txt", "utf-8");
  const url = new URL(req.url, `http://${req.headers.host}`);
  let page;
  if (url.pathname === '/') {
    const postFiles = await readdir('./posts');
    const postSlugs = postFiles.map(file => file.slice(0, file.lastIndexOf('.')));
    page = <BlogIndexPage postSlugs={postSlugs} />
  } else if (!url.pathname.includes('.')) {
    const postSlug = url.pathname.slice(1);
    page = <BlogPostPage postSlug={postSlug} />
  }

  if (page) {
    sendHTML(res, <BlogLayout>{page}</BlogLayout>)
  } else {
    res.writeHead(404);
    res.end();
  }

}).listen(8080);

async function sendHTML(res, jsx) {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(await renderJSXToHTML(jsx));
}

async function renderJSXToHTML(jsx) {
  // let html = '';
  if (typeof jsx === 'string' || typeof jsx === 'number') {
    return escapeHtml(jsx);
  } else if (jsx === null || typeof jsx === 'boolean') {
    return '';
  } else if (Array.isArray(jsx)) {
    const result = await Promise.all(jsx.map(async child => await renderJSXToHTML(child)));
    return result.join('');
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
