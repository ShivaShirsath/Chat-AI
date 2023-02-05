let firefox = true;
if (typeof browser === "undefined") {
  browser = chrome;
  firefox = false;
}

function startScraper() {
  console.log("Loading content script, everything is fine and dandy!");

  let previous_convo;
  let p;
  let id = "";
  let unified_id = false;
  let url = window.location.href;
  let url_split = url.split("/");
  if (url_split.length > 4) {
    previous_convo = true;
    id = url_split[url_split.length - 1];
    console.log("previous convo detected!");
    unified_id = true;
  }

  p = document.querySelector("main > div > div > div");

  let page = [];
  let first_time = false;
  if (!previous_convo) {
    first_time = true;
  }
  document.body
    .appendChild(document.createElement(`div`))
    .setAttribute("id", "chat_history");
  let history_box = document.querySelector("#chat_history");

  let mirror_branch_state;
  mirror_branch_state = new TreeNode();

  function TreeNode(data) {
    this.leaves = [];
    this.data = data;
    this.currentLeafIndex = -1;
  }

  TreeNode.prototype.getData = function () {
    return this.data;
  };

  TreeNode.prototype.getCurrentLeaf = function () {
    return this.leaves[this.currentLeafIndex];
  };

  TreeNode.prototype.getLeaves = function () {
    return this.leaves;
  };

  TreeNode.prototype.addLeaf = function (leaf) {
    this.leaves.push(leaf);
    this.currentLeafIndex++;
  };

  TreeNode.prototype.addLeafCurrentLeaf = function (leaf) {
    let currentLeaf = this.leaves[this.currentLeafIndex];
    if (currentLeaf) {
      currentLeaf.addLeaf(leaf);
    }
  };

  TreeNode.prototype.addLeafByData = function (data) {
    let leaf = new TreeNode(data);
    this.addLeaf(leaf);
  };

  TreeNode.prototype.setData = function (data) {
    this.data = data;
  };

  TreeNode.prototype.setCurrentLeafIndex = function (index) {
    this.currentLeafIndex = index;
  };

  TreeNode.prototype.getCurrentData = function () {
    let data = [this.data];
    let currentLeaf = this.leaves[this.currentLeafIndex];
    let leafData = [];
    if (currentLeaf) {
      leafData = currentLeaf.getCurrentData();
    }
    return data.concat(leafData);
  };

  TreeNode.prototype.toJSON = function () {
    let JSONObject = { data: this.data, leaves: [] };
    for (let index = 0, length = this.leaves.length; index < length; index++) {
      if (this.leaves[index]) {
        JSONObject.leaves[index] = this.leaves[index].toJSON();
      } else {
        console.warn(`TreeNode.toJSON: Empty object at index ${index}.`);
      }
    }
    return JSONObject;
  };

  function saveChildInnerHTML(parent, clone = true) {
    let p1;
    if (clone) {
      p1 = parent.cloneNode(true);
      p1.setAttribute("style", "display: none;");
      history_box.innerHTML = "";
      history_box.appendChild(p1);
    } else {
      p1 = parent;
    }
    var children = p1.children;

    var childInnerHTML = "";

    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.tagName == "PRE") {
        let div = child.firstChild.children[1];
        div.firstChild.classList.add("p-4");
        let text = div.innerHTML;
        let clipboard = `<i class="fa-regular clipboard fa-clipboard"></i>`;
        let copy_bar = `<div class="p-2 copy float-right">${clipboard} &nbsp; Copy code</div>`;
        let template = `<pre>${copy_bar}<div>${text}</div></pre><br>`;
        childInnerHTML += template;
      } else {
        child.removeAttribute("class");
        saveChildInnerHTML(child, false);
        childInnerHTML += child.outerHTML;
      }
    }
    return childInnerHTML;
  }

  function elementChildHasClass(element, className) {
    if (!element) {
      console.warn(
        `undefined element passed, returning undefined and doing nothing.`
      );
      return;
    }
    if (element.classList.contains(className)) return true;

    let children = element.children;
    for (let index = 0; index < children.length; index++) {
      if (elementChildHasClass(children[index], className)) return true;
    }
    return false;
  }

  function save_thread(human, h) {
    let text;
    if (human) {
      text = h.children[0].children[1].innerText;
      if (text.includes("Save & Submit\nCancel")) {
        text = h.querySelector("textarea")?.value;
      }
      text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    if (!human) {
      text = saveChildInnerHTML(
        h.firstChild.children[1].firstChild.firstChild.firstChild
      );
      if (elementChildHasClass(h, "text-red-500")) {
        text = "ERROR";
      }
    }
    return text;
  }

  function getDate() {
    var date = new Date();
    var options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleString("default", options);
  }

  function getTime() {
    var currentDate = new Date();
    var options = {
      hour12: true,
      hour: "numeric",
      minute: "numeric",
    };
    var timeString = currentDate.toLocaleTimeString("default", options);
    return timeString;
  }

  function generateUUID() {
    var possibleChars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var uuid = "";

    for (var i = 0; i < 36; i++) {
      uuid += possibleChars.charAt(
        Math.floor(Math.random() * possibleChars.length)
      );
    }

    return uuid;
  }

  function getTitle() {
    let title = document.querySelector("title").innerText;
    return title;
  }

  function getObjectIndexByID(id, list) {
    for (let i = 0; i < list.length; i++) {
      const obj = list[i];

      if (obj.id && obj.id === id) {
        return i;
      }
    }

    return null;
  }

  function save_page() {
    p = document.querySelector("main > div > div > div > div");
    let c = p.children;
    if (c.length > 2) {
      let t;
      browser.storage.local.get({ threads: null }).then((result) => {
        t = result.threads;
        page = [];
        let current_leaf = mirror_branch_state;
        for (let i = 0; i < c.length - 1; i++) {
          let human = i % 2 === 0;
          let child = c[i];
          let text = save_thread(human, child);

          if (
            text === "ERROR" ||
            text.includes(`<p>network error</p>`) ||
            text.includes(`<p>Load failed</p>`) ||
            text.includes(`<p>Error in body stream/p>`)
          ) {
            text = t[getObjectIndexByID(id, t)].convo[i];
            if (!text.endsWith(`(error)`)) {
              text = `${text}<br> (error)`;
            }
          }
          page.push(text);

          let elements = child.children[0].children[0].querySelectorAll("span");
          let spanText = elements[elements.length - 1]?.innerHTML;
          if (human) {
            if (elements.length < 3) spanText = undefined;
          }

          let leafIndex = 0;
          if (spanText) {
            let spanNumber = Number(spanText.split("/")[0]);
            if (!isNaN(spanNumber)) {
              leafIndex = spanNumber - 1;
              console.log(leafIndex);
            }
          }
          current_leaf.setCurrentLeafIndex(leafIndex);
          if (leafIndex > -1) {
            let new_current_leaf = current_leaf.getCurrentLeaf();
            if (!new_current_leaf) {
              new_current_leaf = new TreeNode();
              current_leaf.getLeaves()[leafIndex] = new_current_leaf;
            }
            new_current_leaf.setData(text);
            current_leaf = new_current_leaf;
          }
        }
        if (mirror_branch_state.toJSON() !== null) {
          if (!previous_convo) {
            let conversation_id_el = document.querySelector("#conversationID");
            if (conversation_id_el !== null) {
              id = conversation_id_el.value;
              unified_id = true;
            } else {
              if (id === "") {
                id = generateUUID();
              }
            }
          }
          if (t !== null) {
            if (first_time) {
              let thread = {
                date: getDate(),
                time: getTime(),
                convo: page,
                favorite: false,
                id: id,
                branch_state: mirror_branch_state.toJSON(),
                unified_id: unified_id,
              };
              first_time = false;
              if (!previous_convo) {
                let title = getTitle();
                if (title !== "New chat") {
                  thread.title = title;
                }
              }
              t.push(thread);
            } else {
              let thread = {
                date: getDate(),
                time: getTime(),
                convo: page,
                favorite: false,
                id: id,
                branch_state: mirror_branch_state.toJSON(),
                unified_id: unified_id,
              };
              if (!previous_convo) {
                let title = getTitle();
                if (title !== "New chat") {
                  thread.title = title;
                }
              }
              let threadIndex = getObjectIndexByID(id, t);
              if (threadIndex !== null) {
                t[threadIndex] = thread;
              } else {
                t.push(thread);
              }
            }
            browser.storage.local.set({ threads: t });
          } else {
            let thread = {
              date: getDate(),
              time: getTime(),
              convo: page,
              favorite: false,
              id: id,
              branch_state: mirror_branch_state.toJSON(),
            };
            if (!previous_convo) {
              let title = getTitle();
              if (title !== "New chat") {
                thread.title = title;
              }
            }
            let t = [thread];
            first_time = false;
            browser.storage.local.set({ threads: t });
          }
        }
      });
    }
  }
  let interval;
  let timer_started = false;

  document.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      if (!timer_started) {
        interval = setInterval(save_page, 2000);
      }
      timer_started = true;
    }
  });

  let main = document.querySelector("main");

  const observer = new MutationObserver(function () {
    if (!timer_started) {
      interval = setInterval(save_page, 2000);
    }
    timer_started = true;
  });
  observer.observe(main, {
    subtree: true,
    childList: true,
  });

  let reset = document.querySelector("nav").firstChild;
  reset.addEventListener("click", function () {
    clearInterval(interval);
    id = "";
    unified_id = false;
    if (document.querySelector("#conversationID")) {
      document.querySelector("#conversationID").remove();
    }
    if (document.querySelector("#history_box")) {
      document.querySelector("#history_box").remove();
    }
    timer_started = false;
    first_time = true;
    mirror_branch_state = new TreeNode();
  });
}

let intro;
let auto_send;
let disable = false;
let defaults = {
  buttons: true,
  auto_send: false,
  disable_history: false,
  auto_delete: false,
  message:
    'The following is a transcript of a conversation between me and ChatGPT. Use it for context in the rest of the conversation. Be ready to edit and build upon the responses previously given by ChatGPT. Respond "ready!" if you understand the context. Do not respond wit anything else. Conversation:\n',
};
browser.storage.local.get({ settings: defaults }, function (result) {
  let settings = result.settings;
  buttons = settings.buttons;
  intro = settings.message;
  auto_send = settings.auto_send;
  if (
    settings.hasOwnProperty("disable_history") &&
    settings.disable_history === true
  ) {
    disable = true;
    console.log("SCRAPER DISABLED!");
  }
  console.log(disable);
  start();
});

function start() {
  if (disable === false) {
    startScraper();
    let scraper_url = window.location.href;

    function check_url() {
      if (scraper_url !== window.location.href) {
        scraper_url = window.location.href;
        first_time = false;
        startScraper();
        id = "";
        if (document.querySelector("#conversationID")) {
          document.querySelector("#conversationID").remove();
        }
        if (document.querySelector("#history_box")) {
          document.querySelector("#history_box").remove();
        }
        timer_started = false;
        // mirror_branch_state = new TreeNode();
        console.log("URL CHANGE");
      }
    }
    setInterval(check_url, 500);
  }
}

function continue_convo(convo) {
  const input = document.querySelector("textarea");
  input.style.height = "200px";
  const button = input.parentElement.querySelector("button");
  input.value = `${intro} ${convo}`;
  if (auto_send) {
    button.click();
  }
}

function use_prompt(prompt) {
  const input = document.querySelector("textarea");
  input.style.height = "200px";
  const button = input.parentElement.querySelector("button");
  input.value = `${prompt}`;
  if (auto_send) {
    button.click();
  }
}

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log(request);
  if (request.type === "c_continue_convo") {
    console.log("message recieved!");
    continue_convo(JSON.stringify(request.convo));
  } else if (request.type === "c_use_prompt") {
    console.log("message recieved!");
    use_prompt(request.prompt);
  }
});
