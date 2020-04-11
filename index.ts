// interface for XPath expression
interface Expression {
  root: string;
  pagination: string;
  queries: {
    [key: string]: string;
  };
}

export default class Hali {
  // init options
  private options = {
    queryFirst: false,
  };

  // init DOM node
  private domContent: Node;

  /**
   * Initialize Node from DOM Node or HTML string.
   * @param content
   */
  constructor(content: Node | string) {
    if (content instanceof Node) {
      this.domContent = content;
    } else {
      // init DOM parser
      const parser = new DOMParser();
      this.domContent = parser.parseFromString(content, 'text/html');
    }
  }

  /**
   * Evaluate an XPath expression in the specified Node
   * and return the result.
   * @param expression
   * @return XPathResult
   */
  evaluate(expression: string): XPathResult {
    return document.evaluate(expression, this.domContent, null, this.options.queryFirst ? XPathResult.FIRST_ORDERED_NODE_TYPE : XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
  }

  /**
   * Extract the text value from a given DOM Node.
   * @param node
   * @return string
   */
  getValue(node: Node | null): string {
    let formattedText = '';
    if (node instanceof Node) {
      switch (node.nodeType) {
        case 1:
          formattedText = node.textContent || '';
          break;
        case 2:
        case 3:
          formattedText = node.nodeValue || '';
          break;
        default:
          formattedText = '';
      }
    }
    return formattedText.trim();
  }

  /**
   * This method selects all matching nodes and extract
   * result in an array.
   * @param expression
   * @param options
   */
  singleQuery(expression: string, options: object = {}): string | string[] {
    // override options
    this.options = Object.assign(this.options, options);

    const evaluate = this.evaluate(expression);
    if (this.options.queryFirst) {
      return this.getValue(evaluate.singleNodeValue);
    } else {
      const records = [];
      let node = null;
      while ((node = evaluate.iterateNext())) {
        const value = this.getValue(node);
        records.push(value);
      }
      return records;
    }
  }

  /**
   * This method selects all matching parent nodes and
   * runs sub queries on child nodes and generate an
   * associative array result.
   * @param expression
   * @param options
   */
  multiQuery(expression: Expression = {
    root: '/html',
    pagination: '',
    queries: {}
  }, options: object = {}): object {
    // override options
    this.options = Object.assign(this.options, options);
    // extract root DOM
    const rootDom = this.evaluate(expression.root);

    const records = [];
    let nodeDom = null;
    while ((nodeDom = rootDom.iterateNext())) {
      // runtime override
      this.options.queryFirst = true;
      this.domContent = nodeDom;

      const record: { [key: string]: string } = {};

      Object.keys(expression.queries).forEach((key: string) => {
        const result = (this.evaluate(expression.queries[key])).singleNodeValue;
        record[key] = this.getValue(result);
      });
      records.push(record);
    }

    // extract next or previous page
    let paginated: string | string[] = '';
    if (expression.pagination) {
      paginated = this.singleQuery(expression.pagination, {
        queryFirst: true,
      });
    }

    // format the data
    return {
      page: paginated,
      data: records,
    };
  }

  /**
   * This method wait for Query Selector existence in seconds
   * @param selector
   * @param maxSeconds
   * @return boolean
   */
  waitSelector(selector: string, maxSeconds = 1): boolean {
    let count = 0;
    let selectorMatch = false;

    const refreshId = setInterval(() => {
      // exit if selector found
      if (document.querySelector(selector)) {
        selectorMatch = true;
        clearInterval(refreshId);
      }
      // exit max seconds reach
      if (count++ >= maxSeconds) {
        clearInterval(refreshId);
      }
    }, 1000);
    return selectorMatch;
  }

  /**
   * This method wait for XPath expression existence in seconds
   * @param expression
   * @param maxSeconds
   * @return boolean
   */
  waitXPath(expression: string, maxSeconds = 1): boolean {
    let count = 0;
    let expressionMatch = false;

    const refreshId = setInterval(() => {
      // exit if selector found
      if (this.singleQuery(expression, {
        queryFirst: true,
      })) {
        expressionMatch = true;
        clearInterval(refreshId);
      }
      // exit max seconds reach
      if (count++ >= maxSeconds) {
        clearInterval(refreshId);
      }
    }, 1000);
    return expressionMatch;
  }
}
