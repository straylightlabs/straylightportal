jQuery(function($) {

  var cardForm = $('#cardForm'),
  formError = $('#cardFormError'),
  cardFormBtn = cardForm.find('button');

  cardForm.submit(function(e) {
    e.preventDefault();

    cardFormBtn.prop('disabled', true);

    var cardNum = $('#card-num').val();
    var cardMonth = $('#card-month').val();
    var cardYear = $('#card-year').val();
    var cardCVC = $('#card-cvc').val();

    Stripe.card.createToken({
      number: cardNum,
      exp_month: cardMonth,
      exp_year: cardYear,
      cvc: cardCVC
    }, function(status, response) {
      if (response.error) {
        formError.find('p').text(response.error.message);
        formError.removeClass('hidden');
        cardForm.find('button').prop('disabled', false);
      } else {
        var token = response.id;
        console.info(token);
        cardForm.append($('<input type="hidden" name="stripeToken" />').val(token));
        cardForm.get(0).submit();
      }
    });

    return false;
  });

});
