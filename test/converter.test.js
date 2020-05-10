const assert = require('chai').assert;
const EvergreenConverter = require('../src/EvergreenConverter');
require('jsdom-global')();

describe('Evergreen Converter', function () {
  describe('header converted', function () {
    it('can convert h1 - h6', function () {
      const parentElement = document.createElement('div');
      const converter = new EvergreenConverter()
      for (var i = 1; i < 7; i++) {
        const header = [{ element: `h${i}`, text: 'Header' }];
        converter.updateData(header).convert(parentElement);

        assert.equal(parentElement.innerHTML, `<h${i}>Header</h${i}>`);
      }
    });

    it('can add identifiers to element', function () {
      const parentElement = document.createElement('div');
      const header = { element: 'h2', id: 'id', classes: ['c1', 'c2'], text: 'Header' };
      const converter = new EvergreenConverter([header]);

      converter.convert(parentElement);
      assert.equal(parentElement.innerHTML, '<h2 id="id" class="c1 c2">Header</h2>');
    });
  });

  describe('paragraph converted', function () {
    it('can convert a paragraph element', function () {
      const parentElement = document.createElement('div');
      const paragraph = { element: 'p', id: 'id', classes: ['c1', 'c2'], text: 'Paragraph' };
      const converter = new EvergreenConverter([paragraph]);

      converter.convert(parentElement);
      assert.equal(parentElement.innerHTML, '<p id="id" class="c1 c2">Paragraph</p>');
    });

    it('can convert a link within a paragraph', function () {
      const parentElement = document.createElement('div');
      const paragraph = { element: 'p', links: [{ href: 'title', text: 'throw', title: 'two links'}], text: 'Can we <a!>throw<!a> in a link?' };
      const converter = new EvergreenConverter([paragraph]);

      converter.convert(parentElement);
      assert.equal(parentElement.innerHTML, '<p>Can we <a href="title" title="two links"></a> in a link?</p>');
    });
  });

  describe('child elements converted', function () {
    it('should be able to handle child elements', function () {
      const parentElement = document.createElement('div');
      const elements = [{
        element: 'div',
        id: 'pID',
        classes: ['pC1'],
        children: [{
          element: 'p',
          text: 'Hello, Child!',
          id: 'cID',
          classes: ['cC1'],
        }],
      }];
      const converter = new EvergreenConverter(elements);
      converter.convert(parentElement);
      assert.equal(parentElement.innerHTML, '<div id="pID" class="pC1"><p id="cID" class="cC1">Hello, Child!</p></div>');
    });
  });

  describe('image converted', function () {
    it('should convert image elements', function () {
      const parentElement = document.createElement('div');
      const image = { element: 'img', src: 'aws_somewhere', alt: 'an image', title: 'grizzly bears' };
      const converter = new EvergreenConverter([image]);
      converter.convert(parentElement);
      assert.equal(parentElement.innerHTML, '<img src="aws_somewhere" alt="an image" title="grizzly bears">');
    });
  });

  describe('lists converted', function () {
    // NOTE: jsdom, the converter library for creating "dom" elements,
    // currently does not use the children of the element in outerHTML,
    // and therefore we need to leave out World! from the anchor.
    // However, since the text is replaced only by using World!
    // if this passes we can safely assume that browsers, which
    // do correctly use the outerHTML method, will display the
    // text that is given in the element.
    const listItems = [{
      element: 'li',
      text: 'Hello <a!>World!<!a>',
      id: 'id',
      classes: ['c1', 'c2'],
      links: [{
        href: 'srced',
        text: 'World!'
      }],
    }];

    it('should convert ordered lists', function () {
      const parentElement = document.createElement('div');
      const list = { element: 'ol', children: listItems };
      const converter = new EvergreenConverter([list]);
      converter.convert(parentElement);
      assert.equal(parentElement.innerHTML, '<ol><li id="id" class="c1 c2">Hello <a href="srced"></a></li></ol>');
    });

    it('should convert unordered lists', function () {
      const parentElement = document.createElement('div');
      const list = { element: 'ul', children: listItems };
      const converter = new EvergreenConverter([list]);
      converter.convert(parentElement);
      assert.equal(parentElement.innerHTML, '<ul><li id="id" class="c1 c2">Hello <a href="srced"></a></li></ul>');
    });
  });

  describe('fall through elements', function () {
    ['div', 'blockquote', 'ul', 'ol'].forEach(function (element) {
      it(`should fall through for ${element}`, function () {
        const parentElement = document.createElement('div');
        const fallthrough = { element, id: 'id', classes: ['c1', 'c2'] };
        const converter = new EvergreenConverter([fallthrough]);

        converter.convert(parentElement);
        assert.equal(parentElement.innerHTML, `<${element} id="id" class="c1 c2"></${element}>`);
      });
    });
    // These elements are self closing, and right now do not take classes/ID
    ['hr', 'br'].forEach(function (element) {
      it(`should fall through for ${element}`, function () {
        const parentElement = document.createElement('div');
        const fallthrough = { element };
        const converter = new EvergreenConverter([fallthrough]);

        converter.convert(parentElement);
        assert.equal(parentElement.innerHTML, `<${element}>`);
      })
    })
  })
});
