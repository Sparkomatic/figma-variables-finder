/// <reference types="@figma/plugin-typings" />

// Figma Variables Finder
// This plugin helps find and explore variables in your design system

interface VariableInfo {
  name: string;
  id: string;
  value: string;
  type: string;
  themeName: string;
  collectionName: string;
}

// Get all variables from the document
async function getAllVariables(): Promise<Variable[]> {
  const variables: Variable[] = [];
  
  // Get all variable collections
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  
  for (const collection of collections) {
    // Get variables in this collection
    const collectionVariables = await figma.variables.getLocalVariablesAsync();
    const filteredVariables = collectionVariables.filter(variable => 
      variable.variableCollectionId === collection.id
    );
    variables.push(...filteredVariables);
  }
  
  return variables;
}

// Recursively resolve variable references to get the final raw value
async function resolveVariableValue(value: any, modeId: string, visitedIds: Set<string> = new Set()): Promise<{ value: string; type: string; chain: string[] }> {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return {
      value: 'null',
      type: 'Null',
      chain: []
    };
  }

  // Handle primitive types first
  if (typeof value === 'number') {
    return {
      value: value.toString(),
      type: 'Number',
      chain: []
    };
  } else if (typeof value === 'string') {
    return {
      value: value,
      type: 'String',
      chain: []
    };
  } else if (typeof value === 'boolean') {
    return {
      value: value.toString(),
      type: 'Boolean',
      chain: []
    };
  }

  // Handle objects
  if (typeof value === 'object') {
    // Check if it's a variable alias
    if ('type' in value && value.type === 'VARIABLE_ALIAS') {
      // Check for circular references
      if (visitedIds.has(value.id)) {
        return {
          value: 'Circular Reference Detected',
          type: 'Circular Reference',
          chain: ['Circular Reference']
        };
      }
      
      visitedIds.add(value.id);
      
      try {
        const referencedVar = await figma.variables.getVariableByIdAsync(value.id);
        if (referencedVar) {
          // Get the value for the current mode
          const referencedValue = referencedVar.valuesByMode[modeId];
          if (referencedValue !== undefined) {
            const resolved = await resolveVariableValue(referencedValue, modeId, visitedIds);
            return {
              value: resolved.value,
              type: resolved.type,
              chain: [referencedVar.name, ...resolved.chain]
            };
          }
        }
      } catch (error) {
        // Variable doesn't exist
        return {
          value: 'Broken Reference',
          type: 'Broken Reference',
          chain: ['Unknown Variable']
        };
      }
    }
    
    // Handle color objects
    if ('type' in value) {
      if (value.type === 'RGB') {
        const colorValue = value as unknown as RGB;
        const r = Math.round(colorValue.r * 255);
        const g = Math.round(colorValue.g * 255);
        const b = Math.round(colorValue.b * 255);
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        return {
          value: hex,
          type: 'Color',
          chain: []
        };
      } else if (value.type === 'RGBA') {
        const colorValue = value as unknown as RGBA;
        const r = Math.round(colorValue.r * 255);
        const g = Math.round(colorValue.g * 255);
        const b = Math.round(colorValue.b * 255);
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        return {
          value: hex,
          type: 'Color',
          chain: []
        };
      }
    }
    
    // Handle raw color objects (without type property)
    if ('r' in value && 'g' in value && 'b' in value) {
      const r = Math.round(value.r * 255);
      const g = Math.round(value.g * 255);
      const b = Math.round(value.b * 255);
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      return {
        value: hex,
        type: 'Color',
        chain: []
      };
    }
    
    // For any other object, try to convert to string
    try {
      const stringValue = JSON.stringify(value);
      return {
        value: stringValue,
        type: 'Object',
        chain: []
      };
    } catch (error) {
      return {
        value: '[Complex Object]',
        type: 'Complex Object',
        chain: []
      };
    }
  }
  
  // Fallback
  return {
    value: String(value),
    type: 'Unknown',
    chain: []
  };
}

// Convert variable to VariableInfo format
async function convertVariableToInfo(variable: Variable, collections: VariableCollection[]): Promise<VariableInfo[]> {
  const variableInfos: VariableInfo[] = [];
  
  // Find the collection this variable belongs to
  const collection = collections.find(col => col.id === variable.variableCollectionId);
  
  // Process each mode's values
  for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
    // Get the mode/theme name
    let modeName = modeId;
    if (collection) {
      const mode = collection.modes.find(m => m.modeId === modeId);
      if (mode) {
        modeName = mode.name;
      }
    }
    
    // Resolve the value (follow reference chain)
    const resolved = await resolveVariableValue(value, modeId);
    
    // Build the display string
    let valueString = resolved.value;
    if (resolved.chain.length > 0) {
      valueString = `${variable.name} → ${resolved.chain.join(' → ')} → ${resolved.value}`;
    } else {
      valueString = `${variable.name} → ${resolved.value}`;
    }
    
    variableInfos.push({
      name: variable.name,
      id: variable.id,
      value: valueString,
      type: resolved.type,
      themeName: modeName,
      collectionName: collection ? collection.name : 'Unknown Collection'
    });
  }
  
  return variableInfos;
}

// Search variables by name
async function searchVariables(variables: Variable[], searchTerm: string, collections: VariableCollection[]): Promise<VariableInfo[]> {
  const searchLower = searchTerm.toLowerCase();
  const matchingVariables: Variable[] = [];
  
  // Find variables that match the search term
  for (const variable of variables) {
    if (variable.name.toLowerCase().includes(searchLower)) {
      matchingVariables.push(variable);
    }
  }
  
  // Convert matching variables to VariableInfo format
  const variableInfos: VariableInfo[] = [];
  for (const variable of matchingVariables) {
    const infos = await convertVariableToInfo(variable, collections);
    variableInfos.push(...infos);
  }
  
  return variableInfos;
}

// Display search results in UI
function displaySearchResults(variables: VariableInfo[]) {
  figma.ui.postMessage({
    type: 'search-complete',
    variables: variables
  });
  
  // Also log to console for debugging
  console.log('Search Results:', variables);
}

// Show the UI
figma.showUI(__html__, { width: 400, height: 600 });

// Handle UI messages
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'search-variables') {
    try {
      const allVariables = await getAllVariables();
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const searchResults = await searchVariables(allVariables, msg.searchTerm, collections);
      displaySearchResults(searchResults);
    } catch (error: any) {
      figma.ui.postMessage({
        type: 'search-error',
        error: error.message
      });
      console.error('Search Error:', error);
    }
  }
}; 