// functions/_middleware.ts
var onRequestGet = async ({
  next
}) => {
  const response = await next();
  return new HTMLRewriter().on("form", {
    element(form) {
      const formName = form.getAttribute("data-static-form-name");
      form.setAttribute("method", "POST");
      form.removeAttribute("action");
      form.append(`<input type="hidden" name="static-form-name" value="${formName}" />`, {
        html: true
      });
    }
  }).transform(response);
};

// api/index.ts
var sendEmail = async (payload) => {
  const response = await fetch("https://api.mailchannels.net/tx/v1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (response.status === 202)
    return {
      success: true
    };
  try {
    const {
      errors
    } = await response.clone().json();
    return {
      success: false,
      errors
    };
  } catch {
    return {
      success: false,
      errors: [response.statusText]
    };
  }
};

var textPlainContent = ({
  request,
  formData,
  name
}) => {
  return `At ${new Date().toISOString()}, you received a new ${name} form submission from ${request.headers.get("CF-Connecting-IP")}:

${[...formData.entries()].map(([field, value]) => `${field}
${value}
`).join("\n")}`;
};

var textHTMLContent = ({
  request,
  formData,
  name
}) => {
  return `<!DOCTYPE html>
  <html>
    <body>
      <h1>New contact form submission</h1>
      <div>At ${new Date().toISOString()}, you received a new ${name} form submission from ${request.headers.get("CF-Connecting-IP")}:</div>
      <table>
      <tbody>
      ${[...formData.entries()].map(([field, value]) => `<tr><td><strong>${field}</strong></td><td>${value}</td></tr>`).join("\n")}
      </tbody>
      </table>
    </body>
  </html>`;
};

var onFormSubmit = async ({
  request,
  env,
  next,
  pluginArgs
}) => {
  let formData, name, token;
  try {
    formData = await request.formData();
    name = formData.get("static-form-name").toString();
    token = formData.get('cf-turnstile-response');
  } catch {}
  if (token) {
    let SECRET_KEY = env.TURNSTILE_KEY;
    if (!SECRET_KEY) {
      return new Response(`Turnstile token found - but no secrey key set. Set an Environment variable with your Turnstile secret called "TURNSTILE_KEY" under Pages > Settings > Environment variables.`, {
        status: 512
      });
    }

    let ip = request.headers.get('CF-Connecting-IP');
    let captchaData = new FormData();
    captchaData.append('secret', SECRET_KEY);
    captchaData.append('response', token);
    captchaData.append('remoteip', ip);
    let url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    let result = await fetch(url, {
      body: formData,
      method: 'POST',
    });
    let outcome = await result.json();
    console.log(outcome);
    if (!outcome.success) {
      console.log("Token Failure!");
      return next();
    }
    console.log("Token success!");
  }
  if (name) {
    formData.delete("static-form-name");
    let submission = {
      formData,
      name,
      request
    };
    let personalizations = typeof pluginArgs.personalizations === "function" ? pluginArgs.personalizations(submission) : pluginArgs.personalizations;
    let from = typeof pluginArgs.from === "function" ? pluginArgs.from(submission) : pluginArgs.from;
    let subject = typeof pluginArgs.subject === "function" ? pluginArgs.subject(submission) : pluginArgs.subject || `New ${name} form submission`;
    let content = pluginArgs.content ? pluginArgs.content(submission) : [{
        type: "text/plain",
        value: textPlainContent(submission)
      },
      {
        type: "text/html",
        value: textHTMLContent(submission)
      }
    ];
    let {
      success
    } = await sendEmail({
      personalizations,
      from,
      subject,
      content
    });
    if (success) {
      return pluginArgs.respondWith(submission);
    }
    return new Response(`Could not send your email. Please try again.`, {
      status: 512
    });
  }
  return next();
};


// ../../../../../../var/folders/ww/hfjqy4gs3p12j4qfrlf026lr0000gp/T/functionsRoutes.mjs
var routes = [{
    routePath: "/",
    mountPath: "/",
    method: "GET",
    middlewares: [onRequestGet],
    modules: []
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "POST",
    middlewares: [onFormSubmit],
    modules: []
  }
];

// ../../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({
        type: "MODIFIER",
        index: i,
        value: str[i++]
      });
      continue;
    }
    if (char === "\\") {
      tokens.push({
        type: "ESCAPED_CHAR",
        index: i++,
        value: str[i++]
      });
      continue;
    }
    if (char === "{") {
      tokens.push({
        type: "OPEN",
        index: i,
        value: str[i++]
      });
      continue;
    }
    if (char === "}") {
      tokens.push({
        type: "CLOSE",
        index: i,
        value: str[i++]
      });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (code >= 48 && code <= 57 || code >= 65 && code <= 90 || code >= 97 && code <= 122 || code === 95) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at " + i);
      tokens.push({
        type: "NAME",
        index: i,
        value: name
      });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at ' + j);
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at " + j);
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at " + i);
      if (!pattern)
        throw new TypeError("Missing pattern at " + i);
      tokens.push({
        type: "PATTERN",
        index: i,
        value: pattern
      });
      i = j;
      continue;
    }
    tokens.push({
      type: "CHAR",
      index: i,
      value: str[i++]
    });
  }
  tokens.push({
    type: "END",
    index: i,
    value: ""
  });
  return tokens;
}

function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes,
    prefixes = _a === void 0 ? "./" : _a;
  var defaultPattern = "[^" + escapeString(options.delimiter || "/#?") + "]+?";
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = function (type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  };
  var mustConsume = function (type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i],
      nextType = _a2.type,
      index = _a2.index;
    throw new TypeError("Unexpected " + nextType + " at " + index + ", expected " + type);
  };
  var consumeText = function () {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  };
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || defaultPattern,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}

function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}

function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode,
    decode = _a === void 0 ? function (x) {
      return x;
    } : _a;
  return function (pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0],
      index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = function (i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function (value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    };
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return {
      path,
      index,
      params
    };
  };
}

function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}

function flags(options) {
  return options && options.sensitive ? "" : "i";
}

function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}

function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function (path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:" + parts.join("|") + ")", flags(options));
}

function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}

function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict,
    strict = _a === void 0 ? false : _a,
    _b = options.start,
    start = _b === void 0 ? true : _b,
    _c = options.end,
    end = _c === void 0 ? true : _c,
    _d = options.encode,
    encode = _d === void 0 ? function (x) {
      return x;
    } : _d;
  var endsWith = "[" + escapeString(options.endsWith || "") + "]|$";
  var delimiter = "[" + escapeString(options.delimiter || "/#?") + "]";
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:" + prefix + "((?:" + token.pattern + ")(?:" + suffix + prefix + "(?:" + token.pattern + "))*)" + suffix + ")" + mod;
          } else {
            route += "(?:" + prefix + "(" + token.pattern + ")" + suffix + ")" + token.modifier;
          }
        } else {
          route += "(" + token.pattern + ")" + token.modifier;
        }
      } else {
        route += "(?:" + prefix + suffix + ")" + token.modifier;
      }
    }
  }
  if (end) {
    if (!strict)
      route += delimiter + "?";
    route += !options.endsWith ? "$" : "(?=" + endsWith + ")";
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiter.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:" + delimiter + "(?=" + endsWith + "))?";
    }
    if (!isEndDelimited) {
      route += "(?=" + delimiter + "|" + endsWith + ")";
    }
  }
  return new RegExp(route, flags(options));
}

function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}

// ../../node_modules/wrangler/pages/functions/template-plugin.ts
function* executeRequest(request, relativePathname) {
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath, {
      end: false
    });
    const mountMatcher = match(route.mountPath, {
      end: false
    });
    const matchResult = routeMatcher(relativePathname);
    const mountMatchResult = mountMatcher(relativePathname);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath, {
      end: true
    });
    const mountMatcher = match(route.mountPath, {
      end: false
    });
    const matchResult = routeMatcher(relativePathname);
    const mountMatchResult = mountMatcher(relativePathname);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}

function template_plugin_default(pluginArgs) {
  const onRequest = async (workerContext) => {
    let {
      request
    } = workerContext;
    const {
      env,
      next,
      data
    } = workerContext;
    const url = new URL(request.url);
    const relativePathname = `/${url.pathname.split(workerContext.functionPath)[1] || ""}`.replace(/^\/\//, "/");
    const handlerIterator = executeRequest(request, relativePathname);
    const pluginNext = async (input, init) => {
      if (input !== void 0) {
        request = new Request(input, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const {
          handler,
          params,
          path
        } = result.value;
        const context = {
          request,
          functionPath: workerContext.functionPath + path,
          next: pluginNext,
          params,
          data,
          pluginArgs,
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext)
        };
        const response = await handler(context);
        return response
      } else {
        return next();
      }
    };
    return pluginNext();
  };
  return onRequest;
}
export {
  template_plugin_default as
  default
};
