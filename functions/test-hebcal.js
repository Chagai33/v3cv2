
const { HDate } = require('@hebcal/core');

const date = new Date('2020-06-06'); // 14 Sivan 5780 approx
const hDate = new HDate(date);
console.log('Default render:', hDate.render());
console.log("render('he'):", hDate.render('he'));
console.log("toString('h'):", hDate.toString('h'));

