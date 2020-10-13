class EvergreenConverter {
  constructor(data) {
    this.data = data;
  };

  updateData(data) {
    this.data = data;
    return this;
  };

  setLinks(element, item) {
    var innerText = item.text;

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

    if (!!item.identifier) {
      const inner = parentElement.innerHTML;
      const split = inner.split(item.identifier);
      const newInner = split[0] + element.outerHTML + split[1];
      parentElement.innerHTML = newInner;
    } else {
      parentElement.appendChild(element);
    }
  };

  convert(parentElement) {
    parentElement.innerHTML = '';
    this.data.forEach((item) => {
      this.createElement(item, parentElement);
    });
  };
}

module.exports = EvergreenConverter;
