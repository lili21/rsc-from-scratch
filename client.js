// console.log('hello, client');
import { hydrateRoot } from 'react-dom/client';

const root = hydrateRoot(document, getInitialClientJSX());

function getInitialClientJSX() {
  const jsx = JSON.parse(window.__CLIENT_JSX__, (key, value) => {
    if (value === '$RE') {
      return Symbol.for('react.element')
    } else {
      return value;
    }
  });
  return jsx;
}

window.addEventListener('click', (e) => {
  if (e.target.tagName !== 'A') {
    return;
  }

  e.preventDefault();
  const href = e.target.getAttribute('href');
  window.history.pushState(null, null, href);
  navigate(href);
})

window.addEventListener('popstate', () => {
  navigate(window.location.pathname);
})

async function navigate(href) {
  const jsx = await fetchJSX(href)
  if (href === window.location.pathname) {
    root.render(jsx);
  }
}

async function fetchJSX(href) {
  const res = await fetch(`${href}?jsx`);
  // console.log(await res.json())
  const jsxString = await res.text();
  const jsx = JSON.parse(jsxString, (key, value) => {
    if (value === '$RE') {
      return Symbol.for('react.element')
    } else {
      return value;
    }
  });
  return jsx;
}
