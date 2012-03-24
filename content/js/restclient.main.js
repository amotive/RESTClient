"use strict";

restclient.main = {
  headerLabelMaxLength: 35,
  headerMenuMaxLength: 25,
  uniqueHeaders: ['authorization'],
  navTop: null,
  init: function() {
    restclient.init();
    
    restclient.main.navTop = $('.subnav').length && $('.subnav').offset().top - $('.navbar').first().height();
    $(window).on('scroll', restclient.main.processScroll).scroll();
    
    $('.modal .btnClose').live('click', function(){
      $(this).parents('.modal').modal('hide');
      return false;
    });
    
    this.initModal();
    this.updateFavoriteHeadersMenu();
    
    $('#request-button').bind('click',function(){
      var method = $('#request-method').val(),
          url = $('#request-url').val(),
          body = $('#request-body').val(),
          headers = [];
      $('#request-headers .label').each(function(){
        headers.push($(this).attr('header-name'), $(this).attr('header-value'));
      });
      restclient.http.sendRequest(method, url, headers, body);
    });
    $('#request-url').bind('keypress', function(evt){
      if(evt.keyCode == 13) {
        $('#request-button').click();
        return false;
      }
    }).focus().select();
    
  },
  processScroll: function () {
    var scrollTop = $(window).scrollTop();
        
    if (scrollTop >= restclient.main.navTop && !$('.subnav').hasClass('subnav-fixed'))
      $('.subnav').addClass('subnav-fixed')
    else
      if (scrollTop <= restclient.main.navTop && $('.subnav').hasClass('subnav-fixed'))
        $('.subnav').removeClass('subnav-fixed');
  },
  initModal: function() {
    $('#modal-basic-authorization').on('show', function(){
      var user = '', pass = '', checked = false, 
          basicAuth = restclient.getPref('basicAuth', "");
      if(typeof basicAuth === "string" && basicAuth != "") {
        basicAuth = JSON.parse(basicAuth);
        user = basicAuth.user,
        pass = basicAuth.pass,
        checked = true;
      }

      $("#modal-basic-authorization [name='username']").val(user);
      $("#modal-basic-authorization [name='password']").val(pass);
      if ( checked ) {
        $("#modal-basic-authorization [name='remember']").attr('checked', true);
      }
      else {
        $("#modal-basic-authorization [name='remember']").removeAttr('checked');
      }
    });
    
    $('#modal-custom-header').on('show',  function(){
      var inputName = $('#modal-custom-header [name="name"]'),
          inputValue = $('#modal-custom-header [name="value"]'),
          headerNames = [];
      
      var source = $(this).data('source');
      //console.log(header);
      if(source) {
        inputName.val(source.attr("header-name"));
        inputValue.val(source.attr("header-value"));
      }
      
      for ( var name in restclient.headers ) {
        headerNames.push(name);
      }
      //console.log(headerNames);
      inputName.attr("data-source", JSON.stringify(headerNames));
      inputName.bind('keypress', function(){
        var name = $(this).val();
        //console.log(name);
        if(name != '' && typeof(restclient.headers[name]) == 'object')
          inputValue.attr("data-source", JSON.stringify(restclient.headers[name]));
      }).keypress();
    }).on('shown', function(){
      $('#modal-custom-header [name="name"]').focus();
      $('#modal-custom-header [name="value"]').bind('focus', function() {
        $(this).select();
      });
      $('#modal-custom-header [name="remember"]').removeAttr('checked');
    }).on('hidden', function(){
      $(this).data('source', null);
    });
  },
  showModal: function(modalId) {
    $('#' + modalId).modal('show').on('shown', function(){
      $(this).find('input').first().focus();
    });
    return false;
  },
  addBasicAuthorization: function() {
    var username = $("#modal-basic-authorization [name='username']"),
        password = $("#modal-basic-authorization [name='password']");
    if(username.val() == '') {
      username.next().text('Please input the username for authorization').show();
      username.focus();
      return false;
    }
    if(password.val() == '') {
      password.next().text('Please input the password for authorization').show();
      password.focus();
      return false;
    }
    var strValue = "Basic " + username.val() + ":" + password.val(),
        strBase64 = btoa(strValue).replace(/.{76}(?=.)/g,'$&\n');
    
    restclient.main.addHttpRequestHeader('Authorization', strBase64);
    if( $("#modal-basic-authorization [name='remember']").attr('checked') === 'checked') {
      var basicAuth = JSON.stringify({'user': username.val(), 'pass': password.val()});
      console.log(basicAuth);
      restclient.setPref("basicAuth", basicAuth);
    }
    else {
      restclient.setPref("basicAuth", "");
    }
    $("#modal-basic-authorization").modal('hide');
  },
  removeHttpRequestHeaderByName: function(name) {
    $('#request-headers span.label').each(function(){
      var header = $(this).text();
      if(header.indexOf(':') == -1)
        return false;
      var headerName = header.substr(0, header.indexOf(':'));
      if(headerName.toLowerCase() == name.toLowerCase())
        $(this).remove();
    });
  },
  removeHttpRequestHeader: function(evt) {
    evt.preventDefault();
    $(this).parent('span').remove();
    if( $('#request-headers span.label').length == 0 ) {
      $('#request-headers').hide();
    }
    return false;
  },
  editHttpRequestHeader: function() {
    
  },
  addHttpRequestHeader: function(name, value){
    if(this.uniqueHeaders.indexOf(name.toLowerCase()) >= 0)
      restclient.main.removeHttpRequestHeaderByName(name);
   
   var text = name + ": " + value;
   
   if (text.length > restclient.main.headerLabelMaxLength)
     text = text.substr(0, restclient.main.headerLabelMaxLength - 3) + "...";
    var span = $('<span />').addClass('label').text(text)
              .attr("title", name + ": " + value)
              .attr('header-name', name)
              .attr('header-value', value)
              .bind('click', function(){
                $('#modal-custom-header').data('source', $(this));
                $('#modal-custom-header').modal('show');
              })
              .append($('<a />').addClass('close').text('×').bind('click', restclient.main.removeHttpRequestHeader));
    span.bind('click', restclient.main.editHttpRequestHeader);
    $('#request-headers').append(span);
    
    if( $('#request-headers span.label').length > 0 ) {
      $('#request-headers').show();
    }
  },
  addCustomHeader: function() {
    var remember = $('#modal-custom-header [name="remember"]'),
        inputName = $('#modal-custom-header [name="name"]'),
        inputValue = $('#modal-custom-header [name="value"]');
    if(remember.attr('checked') == 'checked') {
      var favoriteHeaders = restclient.getPref('favoriteHeaders', '');
      if(favoriteHeaders == '')
        favoriteHeaders = [];
      else
        favoriteHeaders = JSON.parse(favoriteHeaders);
      
      var favorited = false;
      for(var i=0, header; header = favoriteHeaders[i]; i++) {
        if(header[0].toLowerCase() == inputName.val().toLowerCase() 
          && header[1].toLowerCase() == inputValue.val().toLowerCase()) {
          favorited = true;
          break;
        }
      }
      if(!favorited) {
        favoriteHeaders.push([inputName.val(), inputValue.val()]);
        restclient.setPref('favoriteHeaders', JSON.stringify(favoriteHeaders));
        restclient.main.updateFavoriteHeadersMenu();
      }
    }
    var source = $('#modal-custom-header').data('source');
    if(!source)
      this.addHttpRequestHeader(inputName.val(), inputValue.val());
    else
    {
      var text = inputName.val() + ": " + inputValue.val();
      if(text.length > restclient.main.headerLabelMaxLength)
         text = text.substr(0, restclient.main.headerLabelMaxLength-3) + "...";
      source.attr('header-name', inputName.val()).attr('header-value', inputValue.val())
      .attr("title", inputName.val() + ": " + inputValue.val())
      .text(text);
    }
    $('#modal-custom-header').modal('hide');
  },
  updateFavoriteHeadersMenu: function(){
    $('ul.headers .favorite').remove();
    var favoriteHeaders = restclient.getPref('favoriteHeaders', '');
    if(favoriteHeaders == '')
      return false;
    else
      favoriteHeaders = JSON.parse(favoriteHeaders);
    for(var i=0, header; header = favoriteHeaders[i]; i++) {
      var text = header[0] + ": " + header[1];
      
      if (text.length > restclient.main.headerMenuMaxLength)
        text = text.substr(0, restclient.main.headerMenuMaxLength -3) + "...";
      var a =   $('<a class="favorite" href="#"></a>').text(text)
        .attr('header-name', header[0])
        .attr('header-value', header[1]);
      $('.custom-header').after($('<li></li>').append(a));
    }
    $('a.favorite').bind('click', function(evt) {
      restclient.main.addHttpRequestHeader($(this).attr('header-name'), $(this).attr('header-value'));
      evt.preventDefault();
    })
    $('.custom-header').after($('<li class="divider favorite"></li>'));
  },
  clearFavoriteHeaders: function(){
    restclient.setPref('favoriteHeaders', '');
    this.updateFavoriteHeadersMenu();
  },
  setResponseHeader: function(headers, line){
    $('#response-headers pre').text(headers);
    if(typeof line === 'boolean' && line == false) {
      $('#response-headers pre').removeClass('linenums');
    }
    else
    {
      $('#response-headers pre').addClass('linenums');
    }
  },
  updateProgressBar: function(idx, status) {
    if(idx > 0 && idx <=100)
    {
      $('.mainOverlay').show();
      $('.mainOverlay .bar').css('width', idx + "%");
    }
    else
    {
      $('.mainOverlay').hide();
      $('.mainOverlay .bar').css('width', "0%");
    }
    if(status) {
      $('.mainOverlay .status').text(status);
    }
  },
  showResponse: function(){
    $('html, body').animate({scrollTop: $("#response").show().offset().top}, 1000);
    return false;
  },
  clearResult: function(){
    $('.nav-tabs [href="#response-body-preview"]').hide();
    $('.nav-tabs [href="#response-body-highlight"]').hide();
    $('.nav-tabs li').removeClass('active');
    $('.nav-tabs li').first().addClass('active');
    
    $("#response-body-preview div.pre").html('');
    $('#response-body-raw pre').text('');
    $('#response-body-highlight pre').text('');
    restclient.main.setResponseHeader('');
  },
  display: function(xhr) {
    var responseData = xhr.responseText;
    $('#response-body-raw pre').text(responseData);
  },
  displayHtml: function(xhr) {
    var responseData = xhr.responseText,
        iframe = $("<iframe></firame>")
          .attr("type", "content")
          .attr("src", "data:text/html," + encodeURIComponent(responseData));
    
    $("#response-body-preview div.pre").append(iframe);
    
    $('#response-body-raw pre').text(responseData);
    $('#response-body-highlight pre').text(responseData);
    
    $('.nav-tabs [href="#response-body-preview"]').show();
    $('.nav-tabs [href="#response-body-highlight"]').show();
  },
  displayXml: function(xhr) {
    var responseData = xhr.responseText,
        iframe = $("<iframe></firame>")
          .attr("type", "content")
          .attr("src", "data:text/xml," + encodeURIComponent(responseData));
    
    $("#response-body-preview div.pre").append(iframe);
    $('#response-body-raw pre').text(responseData);
    $('#response-body-highlight pre').text(responseData);
    
    $('.nav-tabs [href="#response-body-preview"]').show();
    $('.nav-tabs [href="#response-body-highlight"]').show();
  },
  displayJson: function(xhr) {
    var responseData = xhr.responseText;
    
    $('#response-body-raw pre').text(responseData);
    var reformatted = responseData;
    try{
      reformatted = JSON.stringify(JSON.parse(responseData), null, "  ");
    }catch(e) {}
    $('#response-body-highlight pre').text(reformatted);
    
    $('.nav-tabs [href="#response-body-highlight"]').show();
  },
  displayImage: function(xhr) {
    var responseData = xhr.responseText,
        contentType = xhr.getResponseHeader("Content-Type");
    var toConvert = "";
    for(var i = 0; i < responseData.length; i++){
      toConvert += String.fromCharCode(responseData.charCodeAt(i) & 0xff);
    }
    var base64encoded = btoa(toConvert);
    var imgSrc = "data:" + contentType + ";base64," + base64encoded;
    /*var base64encoded = restclient.base64(responseData),
        imgSrc = "data:" + contentType + ";base64," + base64encoded,*/
    var image = $("<img>").attr("src", imgSrc);
    
    $("#response-body-preview div.pre").append(image);
    $('#response-body-raw pre').text(imgSrc);
    
    $('.nav-tabs [href="#response-body-preview"]').show();
  }
};

window.addEventListener("load", function(){ restclient.main.init();  }, false);
window.addEventListener("unload", function(){ }, false);
