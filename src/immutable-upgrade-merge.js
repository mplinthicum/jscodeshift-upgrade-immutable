function hasAnyMergeFunction(j, root) {
  const mergeFucntions = ['merge', 'mergeDeep', 'mergeIn', 'mergeDeepIn', 'mergeWith', 'mergeDeepWith', 'set', 'setIn'];
  let callExpressions;
  for (let i = 0; i < mergeFucntions.length; i++) {
    callExpressions = root.find(j.CallExpression, {
      callee: {
        object: {
          name: 'state',
        },
        type: 'MemberExpression',
        property: { type: 'Identifier', name: mergeFucntions[i] },
      },
    });
    if (callExpressions.length > 0) {
      return true;
    }
  }
  return false;
}

function transformMergeFunctions(j, root, mergeFunction = 'merge') {
    const callExpressions = root.find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { type: 'Identifier', name: mergeFunction },
      },
    }
  ).filter(e => {
      // filter out arguments that already have fromJS
      return !(e.node.arguments[0].callee && e.node.arguments[0].callee.name === 'fromJS')
    })

  callExpressions.replaceWith(nodePath => {
      const { node } = nodePath;
      const object = j.callExpression(j.identifier('fromJS'),
                                      node.arguments)
      node.arguments = [object];
      return node;
    });
  return root;
}

function transformMergeInOrWithFunctions(j, root, mergeFunction = 'mergeIn') {
    const callExpressions = root.find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { type: 'Identifier', name: mergeFunction },
      },
    }
  ).filter(e => {
    // filter out params already wrapped with fromJS
      return !(e.node.arguments[1].callee && e.node.arguments[1].callee.name === 'fromJS')
  })

  callExpressions.replaceWith(nodePath => {
      const { node } = nodePath;
      const object = j.callExpression(j.identifier('fromJS'),
                                      [node.arguments[1]])
      node.arguments = [node.arguments[0], object];
      return node;
    });
  return root;
}

function getFirstNodePath (j, root){
  return root.find(j.Program).get('body', 0);
}

function getFirstNode (j, root){
  return getFirstNodePath(j, root).node;
}


// Press ctrl+space for code completion
module.exports = function transform(file, api) {
  const j = api.jscodeshift;
  let root = j(file.source);

  // if file doesn't have state.<mergeFunction>, don't do anything to it
  if (!hasAnyMergeFunction(j, root)) {
    return;
  }

  const fromJSDeclaration = root.find(j.ImportSpecifier, {
    imported: {
      type: 'Identifier',
      name: 'fromJS',
    }
  });

  // if file already imports fromJS, there is no need to import
  if (fromJSDeclaration.length === 0) {
    const immutableImportDeclaration = root.find(j.ImportDeclaration, {
      source: {
        type: 'Literal',
        value: 'immutable',
      },
    });

    // appends import with immutable import
    if (immutableImportDeclaration.size() > 0) {
      immutableImportDeclaration.replaceWith(nodePath => {
        const { node } = nodePath;
        node.specifiers.push(j.importSpecifier(j.identifier('fromJS')));
        return node;
      });
    } else {
      // puts import immutable in first line after comments
      const firstNode = getFirstNode(j, root);
      const firstComments = firstNode.comments;
  	if (firstComments && firstComments.length > 0) {
      delete firstNode.comments;
      root.find(firstNode.type).at(0).replaceWith(j.importDeclaration([j.importSpecifier(j.identifier('fromJS'))],
                          j.literal('immutable')));
      const immutableImport = getFirstNode(j, root);
      root.find(immutableImport.type).at(0).insertAfter(firstNode)
      immutableImport.comments = firstComments;

      } else {
        getFirstNodePath(j, root).insertBefore("import { fromJS } from 'immutable';");
      }
    }
  }

  // Puts fromJS on merge arguments
  ['merge', 'mergeDeep'].forEach((mergeFunction) => {
    root = transformMergeFunctions(j, root, mergeFunction);
  });

  ['mergeIn', 'mergeDeepIn', 'mergeWith', 'mergeDeepWith', 'set', 'setIn'].forEach((mergeFunction) => {
    root = transformMergeInOrWithFunctions(j, root, mergeFunction);
  });

  return root.toSource({ quote: 'single' });
}
