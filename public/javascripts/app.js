jQuery(function($) {

  var cardForm = $('#card-form'),
  cardFormButton = cardForm.find('button');

  cardForm.submit(function(e) {
    e.preventDefault();

    cardFormButton.prop('disabled', true);

    Stripe.card.createToken(cardForm, function(status, response) {
      if (response.error) {
        showToast(response.error.message);
        cardFormButton.prop('disabled', false);
      } else {
        var token = response.id;
        cardForm.append($('<input type="hidden" name="stripeToken" />').val(token));
        cardForm.get(0).submit();
      }
    });

    return false;
  });

  $('.confirmation button').click(function(e) {
    var button = $(this);
    if (button.attr('confirmed')) {
      return;
    }

    e.preventDefault();
    $('.confirmation .short-card').removeClass('hidden');
    button.html('Yes, proceed');
    button.attr('confirmed', 'true');
  });

  $('#upload-button').change(function() {
    $('#upload-file').val(this.files[0].name);
  });
});

