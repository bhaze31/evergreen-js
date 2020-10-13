const { v4: uuid } = require('uuid');

class EvergreenProcessor {
  constructor(lines) {
    this.lines = lines;
    this.elements = [];

    // List elements
    this.O_LIST = 'O_LIST';
    this.UO_LIST = 'UO_LIST';
    this.inList = false;
    this.currentList;
    this.currentListType;
    this.currentListIndentLength = 0;
    this.currentSubList = 0;

    // List information
    this.listMatch = new RegExp(/^([0-9]+\.|(-|\+|\*))/);
    this.orderedMatch = new RegExp(/^[0-9]+\./);

    // Blockquote elements
    this.inBlockquote = false;
    this.currentBlockquote;
    this.currentBlockquoteIndentLength = 0;
    this.currentSubQuote = 0;
    this.shouldAppendParagraph = false;

    // Blockquote information
    this.blockMatch = new RegExp(/^>+/);

    // Horizontal information
    this.horizontalMatch = new RegExp(/^(\*{3,}|-{3,}|_{3,})$/);

    // Break information
    this.breakMatch = new RegExp(/ {2,}$/);

    // Link + Image information
    this.altMatch = new RegExp(/!?\[.+\]/);
    this.descMatch = new RegExp(/\(.+\)/);

    // Link information
    this.linkMatch = new RegExp(/[^\!]\[[\w\s"']+\]\([\w\s\/:\."']+\)/);

    // Image information
    this.imageMatch = new RegExp(/!\[.+\]\(.+\)/);

    // Link Image information
    this.linkImageMatch = new RegExp(/\[!\[[\w\s"']+\]\([\w\s\/:\."']+\)\]\([\w\s\/:\."']+\)/);

    // Div elements
    this.inDiv = false;
    this.currentDiv;
    this.divMatch = new RegExp(/^<<-[A-Za-z0-9]{3}/);

    // Table elements
    this.currentTable = null;
    this.inTable = false;
    this.tableMatch = new RegExp(/^\|[\w\s-_\:\|]+\|/);
    this.tableHeaderMatch = new RegExp(/^\|(\:?-{3,}\:?\|)+$/);
    this.centerTableMatch = new RegExp(/\:-{3,}\:/);
    this.leftTableMatch = new RegExp(/\:-{3,}$/);
    this.rightTableMatch = new RegExp(/^-{3,}\:/);
    this.tableAlignments = {
      left: 'left',
      center: 'center',
      right: 'right'
    };

    // Identifier elements
    this.identifierMatch = new RegExp(/\{[\w-_\s\.#]+\}$/);
    this.parentIdentifierMatch = new RegExp(/\{\{[\w-_\s\.#]+\}\}$/);

    this.boldMatch = new RegExp(/\*{2}[^\*]+\*{2}/);
    this.italicMatch = new RegExp(/\*{1}[^\*]+\*{1}/);
    this.boldItalicMatch = new RegExp(/\*{3}[^\*]+\*{3}/);
  };

  resetAllSpecialElements() {
    // List elements
    this.inList = false;
    this.currentList = null;
    this.currentListType = null;
    this.currentListIndentLength = 0;
    this.currentSubList = 0;

    // Blockquote elements
    this.inBlockquote = false;
    this.currentBlockquote = null;
    this.currentBlockquoteIndentLength = 0;
    this.currentSubQuote = 0;
    this.shouldAppendParagraph = false;

    // Table elements
    this.inTable = false;
    this.currentTable = null;
  };

  updateLines(lines) {
    this.lines = lines;
    return this;
  };

  parseLink(text, toTest = this.linkMatch, forwardReplace = '[', element = 'a', spaces = ' ') {
    var match = toTest.exec(text)

    if (!match) { return { text } }

    var alt = this.altMatch.exec(match[0])[0].replace(forwardReplace, '').replace(/]$/, '');
    var linkInfo = this.descMatch.exec(match[0])[0].replace('(', '').replace(/\)$/, '').split(' ');
    var href = linkInfo[0];
    var title = linkInfo.slice(1).join(' ');
    var identifier = uuid();
    var replaced = text.replace(match, `${spaces}${identifier}`);

    return {
      text: replaced,
      child: {
        alt,
        href,
        title,
        identifier,
        element,
        children: []
      }
    };
  };

  parseImage(line) {
    return this.parseLink(line, this.imageMatch, '![', 'img', '')
  }

  parseChildText(element, text) {
    var currentText = text;

    while (this.linkMatch.test(currentText)) {
      var { text: newText, child } = this.parseLink(currentText)
      currentText = newText;
      element.children.push(child);
    }

    return currentText;
  };

  parseParagraph(line) {
    var result = {
      element: 'p',
      children: []
    };

    result.text = this.parseChildText(result, line)

    if (this.identifierMatch.test(result.text)) {
      var { line, id, classes } = this.splitIdentifiersFromLine(result.text);
      result.id = id;
      result.classes = classes;
      result.text = line
    }

    return result;
  };

  splitIdentifiersFromLine(line, matching) {
    if (matching === undefined) {
      matching = this.identifierMatch;
    }

    let iDRegex = new RegExp(/\#[\w-_]+/g)
    let classRegex = new RegExp(/\.[\w-_]+/g)

    let match = matching.exec(line)[0];
    var classMatch, idMatch, id;
    let classes = [];
    while (classMatch = classRegex.exec(match)) {
      classes.push(classMatch[0].replace('.', '').trim())
    }

    while (idMatch = iDRegex.exec(match)) {
      id = idMatch[0].replace('#', '').trim();
    }

    let trimmed = line.replace(matching, '').trim();

    return { line: trimmed, id: id, classes: classes };
  }

  parseHeader(line) {
    var headerRegex = new RegExp('^#+');
    var headerLength = headerRegex.exec(line)[0].length;
    var headerText = line.substring(headerLength).trim();
    if (headerLength > 6) {
      headerLength = 6;
    }

    var result = {
      element: `h${headerLength}`,
      ...this.parseLink(headerText),
    }

    if (this.identifierMatch.test(result.text)) {
      var identifiers = this.splitIdentifiersFromLine(result.text);
      result.id = identifiers.id;
      result.classes = identifiers.classes;
      result.text = identifiers.line
    }

    return result;
  };

  parseItalicMatch(element) {
    let line = element.text;
    let match = this.italicMatch.exec(line);
    let italicReplace = new RegExp(/\*{1}/, "g");
    let identifier = uuid();
    element.text = line.replace(match[0], identifier);

    let italic = {
      element: 'i',
      identifier,
      text: match[0].replace(italicReplace, ''),
      children: []
    }

    element.children.push(italic)
  };

  parseBoldMatch(element) {
    let line = element.text;
    let match = this.boldMatch.exec(line);
    let boldReplace = new RegExp(/\*{2}/, "g");
    let identifier = uuid();
    element.text = line.replace(match[0], identifier);

    let bold = {
      element: 'b',
      identifier,
      text: match[0].replace(boldReplace, ''),
      children: []
    }

    element.children.push(bold);
  };

  parseBoldItalicMatch(element) {
    let line = element.text;
    let match = this.boldItalicMatch.exec(line);
    let replaceAll = new RegExp(/\*{1}/, "g");

    let identifier = uuid();
    let italic = {
      element: 'i',
      text: match[0].replace(replaceAll, ''),
      children: []
    };

    let bold = {
      element: 'b',
      identifier,
      text: '',
      children: [italic],
    };

    element.text = line.replace(match[0], identifier);
    element.children.push(bold);
  };

  parseModifiers(element) {
    while (this.italicMatch.test(element.text)) {
      if (this.boldItalicMatch.test(element.text)) {
        this.parseBoldItalicMatch(element);
      } else if (this.boldMatch.test(element.text)) {
        this.parseBoldMatch(element);
      } else {
        this.parseItalicMatch(element);
      }
    }
  };

  parseTextElement(line) {
    var trimmed = line.trim();
    var element;
    if (trimmed.startsWith('#')) {
      element = this.parseHeader(trimmed);
    } else if (this.imageMatch.test(line)) {
      const { text, child: link } = this.parseImage(line);
      if (text === link.identifier) {
        element = link;
      } else {
        element = {
          element: 'p',
          text,
          children: [link],
        };
      }
    } else {
      element = this.parseParagraph(trimmed);
    }

    if (this.italicMatch.test(element.text)) {
      this.parseModifiers(element);
    }

    return element;
  };

  parseListItem(line) {
    var listMatch = new RegExp(/^([0-9]+\.|(-|\+|\*))/);
    var text = line.replace(listMatch, '').trim();

    var result = {
      element: 'li',
      children: []
    };

    result.text = this.parseChildText(result, text);

    if (this.identifierMatch.test(result.text)) {
      var { line, id, classes } = this.splitIdentifiersFromLine(result.text);
      result.id = id;
      result.classes = classes;
      result.text = line;
    }

    return result;
  };

  parseList(line) {
    var nextListType = this.orderedMatch.exec(line.trim()) ? this.O_LIST : this.UO_LIST;

    if (line.startsWith('  ') && this.inList) {
      // We are attempting to create a sub list
      var indents = 0;
      var indentRegex = new RegExp(/  /g);

      // Find how many indentations we have currently
      while (indentRegex.exec(line)) {
        indents += 1;
      }

      if (this.currentListIndentLength < indents) {
        // We are indenting more than before, create a sub list
        this.currentSubList += 1;

        // Hold access to current list for reference from child list
        var parentList = this.currentList;

        // Get previously created element
        var listItem = parentList.children[parentList.children.length - 1]
        listItem.children = [];

        // Create a new list to append to sublist
        this.currentList = nextListType === this.O_LIST ? this.getOrderedList() : this.getUnorderedList();

        // Add sub list to children of the last list item
        listItem.children.push(this.currentList);

        // Set the parent of the current list to be able to move up levels
        this.currentList.parentList = parentList;

        if (this.parentIdentifierMatch.test(line.trim())) {
          var { line: trimmed, id, classes } = this.splitIdentifiersFromLine(line.trim(), this.parentIdentifierMatch);
          this.currentList.id = id;
          this.currentList.classes = classes;
          line = trimmed;
        }

      } else if (this.currentListIndentLength > indents) {
        // TODO: Handle going back multiple lists
        this.currentSubList -= 1;
        var childList = this.currentList;
        this.currentList = childList.parentList;
      }

      this.currentList.children.push(this.parseListItem(line.trim()));
      this.currentListIndentLength = indents;
    } else if (this.inList && this.currentSubList > 0) {
      // We have moved back to the base list, loop until root parent
      var parentList = this.currentList.parentList;
      while (parentList.parentList) {
        parentList = parentList.parentList;
      }

      this.currentList = parentList;

      // Reset indentation
      this.currentListIndentLength = 0;
      this.currentSubList = 0;

      this.currentList.children.push(this.parseListItem(line.trim()))
    } else if (!this.inList || nextListType !== this.currentListType) {
      this.currentList = nextListType === this.O_LIST ? this.getOrderedList() : this.getUnorderedList();
      this.currentListType = nextListType;
      this.inList = true;
      this.addToElements(this.currentList);

      if (this.parentIdentifierMatch.test(line.trim())) {
        var { line: trimmed, id, classes } = this.splitIdentifiersFromLine(line.trim(), this.parentIdentifierMatch);
        this.currentList.id = id;
        this.currentList.classes = classes;
        line = trimmed;
      }

      this.currentList.children.push(this.parseListItem(line.trim()));
    } else {
      this.currentList.children.push(this.parseListItem(line.trim()));
    }
  };

  parseBlockquote(line) {
    // TODO: Assign quote indent to be able to properly indent with mismatched
    // blockquote lengths
    var quoteRegex = new RegExp(/^>+/g);
    var quoteIndent = quoteRegex.exec(line)[0].length;

    if (this.inBlockquote && this.currentBlockquoteIndentLength < quoteIndent) {
      // Create a new blockquote within the current one
      var parentQuote = this.currentBlockquote;
      this.currentBlockquote = this.getBlockquote();

      parentQuote.children.push(this.currentBlockquote);
      this.currentBlockquote.parentQuote = parentQuote;

      if (this.parentIdentifierMatch.test(line.trim())) {
        var { line: trimmed, id, classes } = this.splitIdentifiersFromLine(line.trim(), this.parentIdentifierMatch);
        this.currentBlockquote.id = id;
        this.currentBlockquote.classes = classes;
        line = trimmed;
      }

      var paragraph = this.parseParagraph(line.replace(this.blockMatch, '').trim());
      this.currentBlockquote.children.push(paragraph);

      this.currentBlockquoteIndentLength = quoteIndent;
    } else if (this.inBlockquote && this.currentBlockquoteIndentLength > quoteIndent) {
      // Go back to a previous blockquote
      var currentQuote = this.currentBlockquote;
      var quoteDifference = this.currentBlockquoteIndentLength - quoteIndent;
      while (quoteDifference > 0) {
        if (!currentQuote.parentQuote) {
          // Difference was greater than number of steps back, set difference to 0
          break;
        }
        currentQuote = currentQuote.parentQuote;
        quoteDifference--;
      }

      this.currentBlockquote = currentQuote;

      var paragraph = this.parseParagraph(line.replace(this.blockMatch, '').trim());
      this.currentBlockquote.children.push(paragraph);

      this.currentBlockquoteIndentLength = quoteIndent;
    } else if (this.inBlockquote) {
      // In current blockquote, check if we should append to the current text
      if (line.replace(this.blockMatch, '').trim() === '') {
        // We are adding another paragraph element
        this.shouldAppendParagraph = true;
      } else if (this.shouldAppendParagraph) {
        // Append to the current quote
        // We have a blank line, create a new paragraph in this blockquote level
        // Reset appending paragraph
        this.shouldAppendParagraph = false;

        // Create a new paragraph and append to the current children
        var paragraph = this.parseParagraph(line.replace(this.blockMatch, '').trim());
        this.currentBlockquote.children.push(paragraph);
      } else {
        var paragraph = this.currentBlockquote.children[this.currentBlockquote.children.length - 1];
        paragraph.text = paragraph.text + ` ${line.replace(this.blockMatch, '').trim()}`;
      }
    } else {
      // Create a blockquote element
      var blockquote = this.getBlockquote();

      if (this.parentIdentifierMatch.test(line.trim())) {
        var { line: trimmed, id, classes } = this.splitIdentifiersFromLine(line, this.parentIdentifierMatch);
        blockquote.id = id;
        blockquote.classes = classes;
        line = trimmed
      }

      // Create the paragraph element
      var paragraph = this.parseParagraph(line.replace(this.blockMatch, '').trim());
      blockquote.children.push(paragraph);

      this.inBlockquote = true;
      this.currentBlockquote = blockquote;
      this.currentBlockquoteIndentLength = quoteIndent;
      this.addToElements(blockquote);
    }
  };

  parseTableRow(line) {
    var tableItems = [];
    line.split('|').filter((item) => !!item).forEach((item) => {
      // TODO: Add rowspan
      // TODO: Add colspan
      // TODO: Add id/classes
      let element = {
        element: 'td',
        alignment: this.tableAlignments.left,
        ...this.parseLink(item)
      };

      tableItems.push(element);
    });

    return tableItems;
  }

  parseTable(line) {
    if (this.inTable) {
      if (this.tableHeaderMatch.test(line) && this.currentTable.children.length === 1) {
        let headerRow = this.currentTable.children[0];
        headerRow.children.forEach((th) => th.element = 'th');

        this.parseTableRow(line)
          .map((alignment) => alignment.text)
          .forEach((alignment, idx) => {
            var element;
            if (idx + 1 > headerRow.children.length) {
              element = { element: 'th' };
              headerRow.children.push(element);
            } else {
              element = headerRow.children[idx];
            }

            if (this.leftTableMatch.test(alignment)) {
              element.alignment = this.tableAlignments.left;
            } else if (this.rightTableMatch.test(alignment)) {
              element.alignment = this.tableAlignments.right;
            } else if (this.centerTableMatch.test(alignment)) {
              element.alignment = this.tableAlignments.center;
            }
          });

        this.currentTable.numColumns = headerRow.children.length;
        return
      }

      let row = { element: 'tr' };

      if (this.identifierMatch.test(line)) {
        var { line: trimmed, id, classes } = this.splitIdentifiersFromLine(line);
        row.id = id;
        row.classes = classes;
        line = trimmed;
      }

      row.children = this.parseTableRow(line);

      if (row.children.length > this.currentTable.numColumns) {
        this.currentTable.numColumns = row.children.length;
      }

      this.currentTable.children.push(row);
    } else {
      let table = { element: 'table' };
      let row = { element: 'tr' };

      if (this.parentIdentifierMatch.test(line)) {
        var { line: trimmed, id, classes } = this.splitIdentifiersFromLine(line, this.parentIdentifierMatch);
        table.id = id;
        table.classes = classes;
        line = trimmed;
      }

      if (this.identifierMatch.test(line)) {
        var { line: trimmed, id, classes } = this.splitIdentifiersFromLine(line);
        row.id = id;
        row.classes = classes;
        line = trimmed;
      }

      table.children = [row];
      row.children = this.parseTableRow(line);
      table.numColumns = row.children.length;
      this.inTable = true;
      this.currentTable = table;

      this.addToElements(table);
    }
  }

  getOrderedList() {
    return {
      element: 'ol',
      children: []
    };
  };

  getUnorderedList() {
    return {
      element: 'ul',
      children: []
    };
  };

  getBlockquote() {
    return {
      element: 'blockquote',
      children: []
    };
  };

  addHorizontalRule() {
    this.addToElements({
      element: 'hr'
    });
  };

  addDiv(line) {
    var result = {
      element: 'div',
      children: [],
    };

    if (this.identifierMatch.test(line.trim())) {
      var { line: trimmed, id, classes } = this.splitIdentifiersFromLine(line.trim());
      result.id = id;
      result.classes = classes;
      result.identifier = trimmed.replace('<<-', '');
    } else {
      result.identifier = line.replace('<<-', '');
    }

    this.addToElements(result);
  };

  addBreak() {
    this.addToElements({
      element: 'br'
    });
  };

  addToElements(element) {
    if (this.inDiv) {
      // We currently have a div, check to see if it is being closed
      if (element.element === 'div' && element.identifier === this.currentDiv.identifier) {
        // We are in the div, closing
        // If there is a parent div, set that to the current div
        if (this.currentDiv.parentDiv) {
          this.currentDiv = this.currentDiv.parentDiv;
        } else {
          // We don't have a parent div
          this.currentDiv = null;
          this.inDiv = false;
        }
      } else {
        this.currentDiv.children.push(element);
        if (element.element === 'div') {
          element.parentDiv = this.currentDiv;
          this.currentDiv = element;
        }
      }
    } else {
      this.elements.push(element);
      if (element.element === 'div') {
        this.inDiv = true;
        this.currentDiv = element;
      }
    }
  };

  parse() {
    // Reset elements
    this.elements = [];
    this.resetAllSpecialElements();
    this.inDiv = false;

    this.lines.forEach((line) => {
      if (this.horizontalMatch.test(line.trim())) {
        this.resetAllSpecialElements();
        this.addHorizontalRule();
      } else if (this.divMatch.test(line.trim())) {
        this.addDiv(line);
      } else if (this.listMatch.test(line.trim())) {
        this.parseList(line);
      } else if (this.blockMatch.test(line.trim())) {
        this.parseBlockquote(line.trim());
      } else if (this.tableMatch.test(line.trim())) {
        this.parseTable(line.trim());
      } else if (line.trim() != '') {
        // Else we are in a non-empty text element
        this.resetAllSpecialElements();

        this.addToElements(this.parseTextElement(line));
      } else {
        this.resetAllSpecialElements();
      }

      if (this.breakMatch.test(line)) {
        this.addBreak();
      }
    });

    return this.elements;
  };
}

module.exports = EvergreenProcessor;
