var converter = new showdown.Converter();
document.querySelectorAll('.md').forEach(function(elt) {
  elt.innerHTML = converter.makeHtml(elt.innerText);
});
