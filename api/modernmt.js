exports = module.exports = exports = module.exports = function() {
  var mod = {
    languagesCallback: async function(callback, errorCallback) {
      var headers = {
        "Accept": "application/json",
        "Content-type": "application/json",
        "MMT-ApiKey": config.modernmt.key,
      };
      var result = await fetch(config.modernmt.link + "/languages", {headers: headers});
      if (result.status === 200) {
        if (typeof callback === "function") callback(await app.utils.request.data(result, "data"));
      } else {
        if (typeof errorCallback === "function") await errorCallback("Could not fetch languages.", await result.text());
      }
    },
    translateWordCallback: async function(callback, errorCallback, word, fromCode, toCode, level) {
      if (!app.has(level)) level = 0;
      word = app.utils.text.clean(word);
      if (!app.has(word) || !app.has(app.utils.text.clean(word, true))) {
        if (typeof callback === "function") await callback(word, false);
      } else {
        var translationKey = fromCode + "-" + toCode + "-" + word;
        var value = await app.api.leveldb.get(config.modernmt.table, translationKey);
        if (app.has(value)) {
          if (typeof callback === "function") await callback(value);
        } else {
          var headers = {
            "Accept": "application/json",
            "Content-type": "application/json",
            "MMT-ApiKey": config.modernmt.key,
          };
          var link = config.modernmt.link + "/translate?source=" + fromCode + "&target=" + toCode + "&q=" + word;
          if (config.api.log.url) console.log(link);
          var result = await fetch(link, {headers: headers});
          if (result.status === 200) {
            var json = await result.json();
            await app.api.leveldb.put(config.modernmt.table, translationKey, json.data.translation);
            if (typeof callback === "function") callback(json.data.translation);
          } else {
            if (typeof errorCallback === "function") errorCallback("Could not translate word: " + word, await result.text());
          }
        }
      }
    },
    translateHTMLCallback: async function(callback, errorCallback, text, fromCode, toCode, level) {
      if (!app.has(level)) level = 0;
      var document = app.utils.text.document(text);
      if (document.childNodes.length > 1 || (document.childNodes.length === 1 && document.childNodes[0].childNodes.length > 0)) {
        var html = "";
        for (var i=0; i<=document.childNodes.length-1; i++) {
          var node = document.childNodes[i];
          if (node.childNodes.length === 0) {
            var {data, error} = await mod.translateWord("data", function() {}, node.innerText, fromCode, toCode, level + 1);
            html += data;
          } else {
            if (app.has(node.tagName)) {
              var attributes = "";
              for (var key in node.attributes) attributes += " " + key + "=" + node.attributes[key];
              var {data, error} = await mod.translateHTML("data", function() {}, String(node.innerHTML), fromCode, toCode, level + 1);
              html += "<" + node.tagName.toLowerCase() + attributes + ">" + data + "</" + node.tagName.toLowerCase() + ">";
            }
          }
        }
        if (app.has(callback)) await callback(html);
      } else {
        await mod.translateWord("data", callback, text, fromCode, toCode, level);
      }
    },
  };
  mod.translateCallback = mod.translateHTMLCallback;
  return mod;
};