class EvergreenConverter {
  constructor(data) {
    this.data = data;
  };

  updateData(data) {
    this.data = data;
    return this;
  };

  setTextElements(element, item) {
    var innerText = item.text;
    if (item.links) {
      item.links.forEach((link) => {
        var anchor = document.createElement('a');
        var anchorRegex = new RegExp(`<a!>${link.text}<!a>`);
        anchor.href = link.href;
        anchor.innerText = link.text;
        if (link.title) {
          anchor.title = link.title;
        }

        console.log(anchor);
        console.log(anchor.outerHTML);
        console.log(anchor.innerHTML);
        innerText = innerText.replace(anchorRegex, anchor.outerHTML);
      });
    }

    element.innerHTML = innerText;
  };

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
        break;
      default:
        this.setTextElements(element, item);
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
