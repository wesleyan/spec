$(function() {
  var showInfo = function(message) {
    $('div.progress').hide();
    $('strong.message').text(message);
    $('div.alert').show();
    $('.alert-info').hide();
  };

  $('input[type="submit"]').on('click', function(evt) {
    if ($('#myFile').val() == '') {
      return false;
    } //don't allow ajax if there is no file
    evt.preventDefault();
    $('div.progress').show();
    var formData = new FormData();
    var file = document.getElementById('myFile').files[0];
    formData.append('myFile', file);

    var xhr = new XMLHttpRequest();

    xhr.open('post', '/fileUpload', true);

    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable) {
        var percentage = (e.loaded / e.total) * 100;
        $('div.progress div.bar').css('width', percentage + '%');
      }
    };

    xhr.onerror = function(e) {
      showInfo('An error occurred while submitting the form. Maybe your file is too big');
    };

    xhr.onload = function() {
      if (this.status == 200) {
        showInfo(this.responseText);
      } else {
        showInfo(this.statusText);
      }
    };
    xhr.send(formData);
  });
});