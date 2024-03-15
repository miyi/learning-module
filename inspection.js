const getAttributeName = (name, decoratorArray = [], control = false) => {
  const eventDirectivePrefix = "event-";
  const controlDirectivePrefix = "controller-";
  const suffix = "-debug";
  let fullname = control? controlDirectivePrefix + name: eventDirectivePrefix + name;
  if (typeof decoratorArray === Array && decoratorArray.length > 0) {
    decoratorArray.forEach((decorator) => {
      fullname += "__" + decorator;
    });
  }
  if (typeof decoratorArray === Object) {
    Object.keys(decoratorArray).forEach((decorator) => {
      fullname += "__" + decorator;
    });
  }
  return fullname + suffix;
};

const getAttribute = (node, attributeName) => {
    return node.getAttribute(attributeName);
}

const exploreNode = (node, tree) => {
  const context = node[Symbol.for("context")];
  if (context.existController) {
    tree.control.push({
      name: "exist",
      decorators: { ...context.existController.decorators },
      value: getAttribute(node, getAttributeName("exist", {...context.existController.decorators}, false))
    });
  }
  if (context.directives)
    if (context.directives.each) {
      tree.control.push({
        name: "each",
        decorators: { ...context.directives.each.decorators },
        value: getAttribute(node, getAttributeName("each", {...context.directives.each.decorators}, false))
      });
    }
  if (JSON.stringify(context.scope) === JSON.stringify(tree.scope)) {
    if (context.directives && context.directives.controllers) {
      context.directives.controllers.forEach((controlDirective) => {
        tree.control.push({
          name: controlDirective.mark,
          decorators: { ...controlDirective.decorators },
          value: getAttribute(node, getAttributeName(controlDirective.mark, { ...controlDirective.decorators }, true))
        });
      });
    }
    if (context.directives && context.directives.eventHandlers) {
      context.directives.eventHandlers.forEach((eventDirective) => {
        tree.event.push({
          name: eventDirective.mark,
          decorator: { ...eventDirective.decorators },
          value: getAttribute(node, getAttributeName(eventDirective.mark, { ...eventDirective.decorators },false))
        });
      });
    }
    if (node.children.length > 0) {
      Array.from(node.children).forEach((childnode) => {
        exploreNode(childnode, tree);
      });
    }
  } else {
    tree.children.push(
      getScopeTree(node, JSON.parse(JSON.stringify({ ...context.scope })))
    );
  }
};

export const getScopeTree = (node, scope = null) => {
  const tree = {
    scope,
    event: [],
    control: [],
    meta: [],
    children: [],
  };
  if (node.children.length > 0) {
    Array.from(node.children).forEach((childNode) => {
      exploreNode(childNode, tree);
    });
  }
  return tree;
};

// function getElementTree(node) {
//   // Base case: if the node is not an element (e.g., text node), return its value
//   if (node.nodeType !== Node.ELEMENT_NODE) {
//     return { value: node.nodeValue };
//   }

//   // Construct the current node's structure with its tag name
//   const nodeStructure = {
//     tagName: node.tagName,
//     attributes: {},
//     children: [],
//   };

//   // Add attributes to the node's structure
//   Array.from(node.attributes).forEach((attr) => {
//     nodeStructure.attributes[attr.nodeName] = attr.nodeValue;
//   });

//   // Recursively add children
//   node.childNodes.forEach((child) => {
//     nodeStructure.children.push(getElementTree(child));
//   });

//   return nodeStructure;
// }

// export const inspectBody = async (iframe, $scope) => {
//   $scope.checking = true;
//   new Promise((resolve) => {
//     resolve(getElementTree(iframe.contentWindow.document.body));
//   }).then((tree) => {
//     $scope.checking = false;
//     $scope.elementTree = tree;
//   });
// };

export const getObj = (iframe) => {
  const obj =
    iframe.contentWindow.document.body.children[0].children[3].children[0][
      Symbol.for("context")
    ];
  //window ->
  console.log(obj);
};
