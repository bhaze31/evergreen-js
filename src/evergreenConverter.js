class EvergreenConverter {
  constructor(data) {
    this.data = data;
  };

  updateData(data) {
    this.data = data;
    return this;
  };

  setExternal(element, item) {
    if (item.element === 'img') {
      element.src = item.dest;
      element.alt = item.text;
    } else {
      element.href = item.dest;
      element.innerText = item.text
    }

    if (item.title) {
      element.title = item.title;
    }

    return element;
  }

  setTableElements(element, item) {
    element.style.textAlign = item.alignment;
    element.innerHTML = item.text;
    this.setExternal(element, item);
  }

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
      case 'a':
        this.setExternal(element, item);
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
        console.log(item.text);
        element.innerHTML = item.text;
        break;
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
