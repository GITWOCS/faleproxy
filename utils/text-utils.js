function replaceYaleWithFalePreservingCase(text) {
  if (typeof text !== 'string') {
    return text;
  }

  return text.replace(/yale/gi, (match) => {
    if (match === match.toUpperCase()) {
      return 'FALE';
    }

    if (match === match.toLowerCase()) {
      return 'fale';
    }

    if (match[0] === match[0].toUpperCase() && match.slice(1) === match.slice(1).toLowerCase()) {
      return 'Fale';
    }

    return 'Fale';
  });
}

module.exports = {
  replaceYaleWithFalePreservingCase,
};
