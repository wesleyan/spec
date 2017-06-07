var converter = new showdown.Converter();
converter.setFlavor('github');
document.querySelectorAll('.md').forEach(function(elt) {
  elt.innerHTML = converter.makeHtml(elt.innerHTML);
});
