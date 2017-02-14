jQuery(function($) {

  var cardForm = $('#cardForm'),
  cardFormButton = cardForm.find('button'),
  formError = $('#cardFormError');

  cardForm.submit(function(e) {
    e.preventDefault();

    cardFormButton.prop('disabled', true);

    Stripe.card.createToken(cardForm, function(status, response) {
      if (response.error) {
        formError.find('p').text(response.error.message);
        formError.removeClass('hidden');
        cardFormButton.prop('disabled', false);
      } else {
        var token = response.id;
        cardForm.append($('<input type="hidden" name="stripeToken" />').val(token));
        cardForm.get(0).submit();
      }
    });

    return false;
  });

  $('#confirmation button').click(function(e) {
    var button = $(this);
    if (button.attr('confirmed')) {
      return;
    }

    e.preventDefault();
    $('#confirmation .well').removeClass('hidden');
    button.html('Yes, proceed');
    button.attr('confirmed', 'true');
  });
});

