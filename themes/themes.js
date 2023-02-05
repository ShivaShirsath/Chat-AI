function injectStylesheet(file) {
  let head = document.querySelector("head");
  let stylesheet = document.createElement("link");
  stylesheet.setAttribute("rel", "stylesheet");
  stylesheet.setAttribute("type", "text/css");
  stylesheet.setAttribute("href", file);
  head.appendChild(stylesheet);
}

function injectStyle() {
  let head = document.querySelector("head");
  let style = document.createElement("style");
  head.appendChild(style);
}

function initializeThemes() {
  injectStylesheet(
    browser.runtime.getURL("themes/shiva.css")
  );
  injectStyle();
}

initializeThemes();
