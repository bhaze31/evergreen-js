class EvergreenConverter {
  constructor(data) {
    this.data = data;

    this.boldMatch = new RegExp(/<b!>[^<]+<!b>/);
    this.italicMatch = new RegExp(/<i!>[^<]+<!i>/);
    this.boldItalicMatch = new RegExp(/<b!><i!>[^<]+<!i><!b>/);
  };

  updateData(data) {
    this.data = data;
    return this;
  };

  setModifiers(text) {
    var match;
    while (match = this.boldItalicMatch.exec(text)) {
      let italic = document.createElement('i');
      let bold = document.createElement('b');
      var replacementText = match[0].replace('<b!><i!>', '').replace('<!i><!b>', '');
      italic.innerText = replacementText;

      bold.appendChild(italic);
      text = text.replace(match[0], bold.outerHTML);
    }

    while (match = this.italicMatch.exec(text)) {
      var italic = document.createElement('i');
      var replacementText = match[0].replace('<i!>', '').replace('<!i>', '');
      italic.innerText = replacementText;

      text = text.replace(match[0], italic.outerHTML);
    }

    while (match = this.boldMatch.exec(text)) {
      var bold = document.createElement('b');
      var replacementText = match[0].replace('<b!>', '').replace('<!b>', '');
      bold.innerText = replacementText;

      text = text.replace(match[0], bold.outerHTML);
    }

    return text;
  };

  setLinks(element, item) {
    var innerText = item.text;

    if (this.boldMatch.test(innerText) || this.italicMatch.test(innerText)) {
      innerText = this.setModifiers(innerText);
    }

    if (item.links && item.links.length > 0) {
      item.links.forEach((link) => {
        var anchor = document.createElement('a');
        var anchorRegex = new RegExp(`<a!>${link.text}<!a>`);
        anchor.href = link.href;
        anchor.innerText = link.text;
        if (link.title) {
          anchor.title = link.title;
        }

        innerText = innerText.replace(anchorRegex, anchor.outerHTML);
      });
    }

    element.innerHTML = innerText;
  };

  setTableElements(element, item) {
    element.style.textAlign = item.alignment;
    this.setLinks(element, item);
  }

  setImageElements(element, item) {
    element.src = item.src;
    element.alt = item.alt;
    element.title = item.title;
  };

  setIdentifiers(element, id, classes) {
    if (!!id) {
      element.id = id
    }

    if (classes && classes.length > 0) {
      classes.forEach(function (c) {
        element.classList.add(c);
      });
    }
  }

  createElement(item, parentElement) {
    let element = document.createElement(item.element);
    switch (item.element) {
      case 'img':
        this.setImageElements(element, item);
        break;
      case 'div':
      case 'blockquote':
      case 'ul':
      case 'ol':
      case 'hr':
      case 'br':
      case 'table':
      case 'tr':
        break;
      case 'th':
      case 'td':
        this.setTableElements(element, item);
        break;
      default:
        this.setLinks(element, item);
    }

    this.setIdentifiers(element, item.id, item.classes);

    if (item.children && item.children.length) {
      item.children.forEach((child) => {
        this.createElement(child, element);
      });
    }

    parentElement.appendChild(element);
  };

  convert(parentElement) {
    parentElement.innerHTML = '';
    this.data.forEach((item) => {
      this.createElement(item, parentElement);
    });
  };
}

module.exports = EvergreenConverter;
