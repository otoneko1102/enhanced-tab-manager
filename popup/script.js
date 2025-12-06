document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const msg = chrome.i18n.getMessage(el.getAttribute("data-i18n"));
    if (msg) el.textContent = msg;
  });
  const phGroupName = chrome.i18n.getMessage("phGroupName");
  const phPatterns = chrome.i18n.getMessage("phPatterns");
  const msgImportSuccess = chrome.i18n.getMessage("alertImportSuccess");
  const msgImportFail = chrome.i18n.getMessage("alertImportFail");

  const chkEnableManager = document.getElementById("chk-enable-manager");
  const chkEnableGrouping = document.getElementById("chk-enable-grouping");
  const chkKeepWindow = document.getElementById("chk-keep-window");

  const optIgnoreProtocol = document.getElementById("opt-ignore-protocol");
  const optIgnoreWww = document.getElementById("opt-ignore-www");
  const optIgnoreQuery = document.getElementById("opt-ignore-query");
  const optIgnoreHash = document.getElementById("opt-ignore-hash");
  const optDomainOnly = document.getElementById("opt-domain-only");
  const optDisableWildcards = document.getElementById("opt-disable-wildcards");

  const managerUI = document.getElementById("manager-ui");
  const groupingUI = document.getElementById("grouping-ui");

  const closedList = document.getElementById("closed-list");
  const restoreAllBtn = document.getElementById("restore-all");
  const clearAllBtn = document.getElementById("clear-all");
  const saveCloseAllBtn = document.getElementById("save-close-all");

  const groupList = document.getElementById("group-list");
  const addGroupBtn = document.getElementById("add-group");

  const btnExport = document.getElementById("btn-export");
  const btnImportTrigger = document.getElementById("btn-import-trigger");
  const fileImport = document.getElementById("file-import");

  const availableColors = [
    "grey",
    "blue",
    "red",
    "yellow",
    "green",
    "pink",
    "purple",
    "cyan",
    "orange",
  ];

  let closedTabs = [];
  let groups = [];

  function loadSettings() {
    const keys = [
      "enableManager",
      "enableGrouping",
      "keepWindowOpen",
      "optIgnoreProtocol",
      "optIgnoreWww",
      "optIgnoreQuery",
      "optIgnoreHash",
      "optDomainOnly",
      "optDisableWildcards",
    ];
    chrome.storage.local.get(keys, (res) => {
      const eM = res.enableManager !== false;
      const eG = res.enableGrouping !== false;
      const kW = res.keepWindowOpen === true;
      chkEnableManager.checked = eM;
      chkEnableGrouping.checked = eG;
      chkKeepWindow.checked = kW;

      optIgnoreProtocol.checked = res.optIgnoreProtocol !== false;
      optIgnoreWww.checked = res.optIgnoreWww !== false;
      optIgnoreQuery.checked = res.optIgnoreQuery !== false;
      optIgnoreHash.checked = res.optIgnoreHash !== false;
      optDomainOnly.checked = res.optDomainOnly === true;
      optDisableWildcards.checked = res.optDisableWildcards === true;

      toggleUI(eM, eG);
    });
  }
  loadSettings();

  function bindCheckbox(elem, key) {
    elem.addEventListener("change", () => {
      chrome.storage.local.set({ [key]: elem.checked });
    });
  }

  bindCheckbox(chkEnableManager, "enableManager");
  bindCheckbox(chkEnableGrouping, "enableGrouping");
  bindCheckbox(chkKeepWindow, "keepWindowOpen");

  bindCheckbox(optIgnoreProtocol, "optIgnoreProtocol");
  bindCheckbox(optIgnoreWww, "optIgnoreWww");
  bindCheckbox(optIgnoreQuery, "optIgnoreQuery");
  bindCheckbox(optIgnoreHash, "optIgnoreHash");
  bindCheckbox(optDomainOnly, "optDomainOnly");
  bindCheckbox(optDisableWildcards, "optDisableWildcards");

  chkEnableManager.addEventListener("change", () =>
    toggleUI(chkEnableManager.checked, chkEnableGrouping.checked),
  );
  chkEnableGrouping.addEventListener("change", () =>
    toggleUI(chkEnableManager.checked, chkEnableGrouping.checked),
  );

  function toggleUI(showManager, showGrouping) {
    managerUI.style.display = showManager ? "block" : "none";
    groupingUI.style.display = showGrouping ? "block" : "none";
  }

  btnExport.addEventListener("click", () => {
    chrome.storage.local.get(null, (items) => {
      const json = JSON.stringify(items, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tab-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });

  btnImportTrigger.addEventListener("click", () => {
    fileImport.click();
  });

  fileImport.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (typeof data !== "object" || data === null) throw new Error();
        chrome.storage.local.set(data, () => {
          alert(msgImportSuccess);
          window.location.reload();
        });
      } catch (err) {
        alert(msgImportFail);
      }
    };
    reader.readAsText(file);
    fileImport.value = "";
  });

  chrome.commands.getAll((commands) => {
    const shortcuts = {};
    commands.forEach((c) => {
      if (c.shortcut) shortcuts[c.name] = c.shortcut;
    });
    if (shortcuts.restore_all_tabs)
      restoreAllBtn.textContent += ` (${shortcuts.restore_all_tabs})`;
    if (shortcuts.clear_all_saved_tabs)
      clearAllBtn.textContent += ` (${shortcuts.clear_all_saved_tabs})`;
    if (shortcuts.save_and_close_all_tabs)
      saveCloseAllBtn.textContent += ` (${shortcuts.save_and_close_all_tabs})`;
  });

  function saveClosedTabs() {
    chrome.storage.local.set({ closedTabs });
    renderClosedTabs();
  }

  function renderClosedTabs() {
    closedList.innerHTML = "";
    closedTabs.forEach((tab, i) => {
      const li = document.createElement("li");

      const icon = document.createElement("img");
      icon.src = tab.favIconUrl || "../icons/16x16.png";
      icon.style.width = "16px";
      icon.style.height = "16px";
      icon.style.marginRight = "8px";
      icon.onerror = () => {
        icon.src = "../icons/16x16.png";
      };

      const a = document.createElement("a");
      a.textContent = tab.title;
      a.href = "#";
      a.style.flex = "1";
      a.style.textDecoration = "none";
      a.style.color = "inherit";
      a.style.whiteSpace = "nowrap";
      a.style.overflow = "hidden";
      a.style.textOverflow = "ellipsis";

      const restore = (e) => {
        if (e.target.tagName === "BUTTON" || e.target.tagName === "SELECT")
          return;
        chrome.tabs.create({ url: tab.url, active: false });
        closedTabs.splice(i, 1);
        saveClosedTabs();
      };
      li.addEventListener("click", restore);
      a.addEventListener("click", (e) => {
        e.preventDefault();
      });

      const del = document.createElement("button");
      del.textContent = "×";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        closedTabs.splice(i, 1);
        saveClosedTabs();
      });

      li.append(icon, a, del);
      closedList.append(li);
    });
  }

  restoreAllBtn.addEventListener("click", () => {
    closedTabs.forEach((t) =>
      chrome.tabs.create({ url: t.url, active: false }),
    );
    closedTabs = [];
    saveClosedTabs();
  });

  clearAllBtn.addEventListener("click", () => {
    closedTabs = [];
    saveClosedTabs();
  });

  saveCloseAllBtn.addEventListener("click", async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const newTabs = tabs
      .filter((t) => typeof t.url === "string")
      .map((t) => ({
        title: t.title || t.url,
        url: t.url,
        favIconUrl: t.favIconUrl,
      }));

    chrome.storage.local.get(["closedTabs", "keepWindowOpen"], (res) => {
      const existing = res.closedTabs || [];
      const keep = res.keepWindowOpen || false;
      closedTabs = [...existing, ...newTabs];
      chrome.storage.local.set({ closedTabs }, async () => {
        if (keep) await chrome.tabs.create({});
        const ids = tabs.map((t) => t.id).filter(Boolean);
        chrome.tabs.remove(ids);
        renderClosedTabs();
      });
    });
  });

  chrome.storage.local.get("closedTabs", (res) => {
    closedTabs = res.closedTabs || [];
    renderClosedTabs();
  });

  function saveGroups() {
    chrome.storage.local.set({ groups });
    renderGroups();
  }

  function renderGroups() {
    groupList.innerHTML = "";
    groups.forEach((g, idx) => {
      const li = document.createElement("li");
      li.className = "group-row";

      const colorSel = document.createElement("select");
      colorSel.className = "color-select";
      colorSel.style.borderLeft = `5px solid ${g.color || "grey"}`;
      availableColors.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        if (c === (g.color || "grey")) opt.selected = true;
        colorSel.appendChild(opt);
      });
      colorSel.addEventListener("change", () => {
        groups[idx].color = colorSel.value;
        saveGroups();
      });

      const nameInp = document.createElement("input");
      nameInp.className = "group-name";
      nameInp.value = g.name;
      nameInp.placeholder = phGroupName;
      nameInp.addEventListener("change", () => {
        groups[idx].name = nameInp.value.trim();
        saveGroups();
      });

      const patInp = document.createElement("input");
      patInp.className = "group-patterns";
      patInp.value = g.patterns.join(" ");
      patInp.placeholder = phPatterns;
      patInp.addEventListener("change", () => {
        groups[idx].patterns = patInp.value
          .trim()
          .split(/\s+/)
          .filter((s) => s);
        saveGroups();
      });

      const del = document.createElement("button");
      del.textContent = "×";
      del.addEventListener("click", () => {
        groups.splice(idx, 1);
        saveGroups();
      });

      li.append(colorSel, nameInp, patInp, del);
      groupList.append(li);
    });
  }

  addGroupBtn.addEventListener("click", () => {
    groups.push({ name: "", patterns: [], color: "grey" });
    saveGroups();
  });

  chrome.storage.local.get("groups", (res) => {
    groups = res.groups || [];
    renderGroups();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.closedTabs) {
      closedTabs = changes.closedTabs.newValue || [];
      renderClosedTabs();
    }
    if (changes.groups) {
      groups = changes.groups.newValue || [];
      renderGroups();
    }

    if (changes.enableManager) {
      chkEnableManager.checked = changes.enableManager.newValue;
      toggleUI(chkEnableManager.checked, chkEnableGrouping.checked);
    }
    if (changes.enableGrouping) {
      chkEnableGrouping.checked = changes.enableGrouping.newValue;
      toggleUI(chkEnableManager.checked, chkEnableGrouping.checked);
    }
    if (changes.keepWindowOpen)
      chkKeepWindow.checked = changes.keepWindowOpen.newValue;

    // URL Options sync
    if (changes.optIgnoreProtocol)
      optIgnoreProtocol.checked = changes.optIgnoreProtocol.newValue;
    if (changes.optIgnoreWww)
      optIgnoreWww.checked = changes.optIgnoreWww.newValue;
    if (changes.optIgnoreQuery)
      optIgnoreQuery.checked = changes.optIgnoreQuery.newValue;
    if (changes.optIgnoreHash)
      optIgnoreHash.checked = changes.optIgnoreHash.newValue;
    if (changes.optDomainOnly)
      optDomainOnly.checked = changes.optDomainOnly.newValue;
    if (changes.optDisableWildcards)
      optDisableWildcards.checked = changes.optDisableWildcards.newValue;
  });
});
