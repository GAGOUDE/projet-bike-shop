var express = require('express');
var router = express.Router();

const stripe = require('stripe')('rk_test_51KHngLHjnRKbfqCmZcp0NJKYYdRateSyJi0W1CJaTpimtWE8mTeaoEn1n1My2ZpXpPsm1X0p1Pk7kkFuKamhAAVo004Me0wUJO');

var dataBike = [
  { name: "BIK045", url: "/images/bike-1.jpg", price: 679 },
  { name: "ZOOK07", url: "/images/bike-2.jpg", price: 999 },
  { name: "TITANS", url: "/images/bike-3.jpg", price: 799 },
  { name: "CEWO", url: "/images/bike-4.jpg", price: 1300 },
  { name: "AMIG039", url: "/images/bike-5.jpg", price: 479 },
  { name: "LIK099", url: "/images/bike-6.jpg", price: 869 },
];

// Fonction qui calcule les frais de port et le total de la commande
let calculTotalCommande = (dataCardBike) => {
  let nbProduits = 0;
  let totalCmd = 0;

  for (let i = 0; i < dataCardBike.length; i++) {
    nbProduits += dataCardBike[i].quantity;
    totalCmd += dataCardBike[i].quantity * dataCardBike[i].price;
  }
  let montantFraisPort = nbProduits * 30;

  if (totalCmd > 4000) {
    montantFraisPort = 0;
  } else if (totalCmd > 2000) {
    montantFraisPort = montantFraisPort / 2;
  }

  totalCmd += montantFraisPort;

  return { montantFraisPort, totalCmd };
}

/* GET home page. */
router.get('/', function (req, res, next) {
  if (req.session.dataCardBike == undefined) {
    req.session.dataCardBike = [];
  }

  res.render('index', { dataBike: dataBike });
});

router.get('/shop', async function (req, res, next) {
  if (req.session.dataCardBike == undefined) {
    req.session.dataCardBike = [];
  }

  let total = calculTotalCommande(req.session.dataCardBike);

  // Frais de port
  let montantFraisPort = total.montantFraisPort

  // Total commande
  let montantCommande = total.totalCmd

  console.log(req.session, montantFraisPort, montantCommande);

  res.render('shop', { dataCardBike: req.session.dataCardBike, montantFraisPort, montantCommande });
});

//===== AJOUT DE BIKE AU PANIER
router.get('/add-shop', async function (req, res, next) {
  if (req.session.dataCardBike == undefined) {
    req.session.dataCardBike = [];
  }

  // Gestion de la quantitié
  var alreadyExist = false;

  for (let i = 0; i < req.session.dataCardBike.length; i++) {
    if (req.session.dataCardBike[i].name == req.query.bikeNameFromFront) {
      req.session.dataCardBike[i].quantity = Number(req.session.dataCardBike[i].quantity) + 1;
      alreadyExist = true;
    }
  }

// Ajout de bike qui n'est pas présent au panier
  if(alreadyExist == false){
    req.session.dataCardBike.push({
      name: req.query.bikeNameFromFront,
      url: req.query.bikeImageFromFront,
      price: req.query.bikePriceFromFront,
      quantity: 1
    });
  }

  res.redirect('/shop');
});

//===== SUPPRESSION DE BIKE
router.get('/delete-shop', function (req, res, next) {
  if (req.session.dataCardBike == undefined) {
    req.session.dataCardBike = [];
  }

  req.session.dataCardBike.splice(req.query.position, 1)

  res.redirect('/shop', { dataCardBike: req.session.dataCardBike })
});

//===== MISE A JOUR
router.post('/update-shop', function (req, res, next) {
  // if (req.session.dataCardBike == undefined) {
  //   req.session.dataCardBike = [];
  // }

  let position = req.body.position;
  let newQuantity = req.body.quantity;

  req.session.dataCardBike[position].quantity = Number(newQuantity);

  console.log(position)
  console.log(newQuantity)

  res.redirect('/shop', { dataCardBike: req.session.dataCardBike })
});

//===== PAEIMENT AVEC STRIPE 
router.post('/create-checkout-session', async (req, res) => {
  if (req.session.dataCardBike == undefined) {
    req.session.dataCardBike = [];
  }

  let total = calculTotalCommande(req.session.dataCardBike);

  // Frais de port
  let montantFraisPort = total.montantFraisPort;

  let stripeItems = [];

  for (let i = 0; i < req.session.dataCardBike.length; i++) {
    stripeItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: req.session.dataCardBike[i].name,
        },
        unit_amount: req.session.dataCardBike[i].price * 100,
      },
      quantity: req.session.dataCardBike[i].quantity,
    });
  }

  if (montantFraisPort > 0) {
    stripeItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Frais de port',
        },
        unit_amount: montantFraisPort * 100,
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: stripeItems,
    mode: "payment",
    success_url: "http://localhost:3000/confirm",
    cancel_url: "http://localhost:3000/",
  });

  res.redirect(303, session.url);
});

router.get('/confirm', function (req, res, next) {
  res.render('confirm')
})

module.exports = router;
