$( function() {
  Modernizr.addTest('backgroundclip',function() {

    var div = document.createElement('div');

    if ('backgroundClip' in div.style)
      return true;

    'Webkit Moz O ms Khtml'.replace(/([A-Za-z]*)/g,function(val) { 
      if (val+'BackgroundClip' in div.style) return true;
    });

  });

  $( 'h1' ).fitText();
});
