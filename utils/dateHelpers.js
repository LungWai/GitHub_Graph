const moment = require('moment');
const random = require('random');

const isPrime = (num) => {
  if (num <= 1) return false;
  if (num === 2) return true;
  if (num % 2 === 0) return false;
  
  const sqrt = Math.sqrt(num);
  for (let i = 3; i <= sqrt; i += 2) {
    if (num % i === 0) return false;
  }
  return true;
};

const getValidDate = (year, yearsToSubtract) => {
  const maxDate = moment();
  const minDate = moment().subtract(year, 'y');
  
  let attempts = 0;
  let date;
  
  do {
    if (attempts++ > 3) {
      return moment().subtract(yearsToSubtract, 'y')
        .set('hour', 20)
        .set('minute', 30);
    }

    const x = random.int(0, 51);
    const y = random.int(0, 6);
    
    date = moment()
      .subtract(yearsToSubtract, 'y')
      .add(x, 'w')
      .add(y, 'd')
      .set('hour', random.int(19, 23))
      .set('minute', random.int(0, 59));
    
    const week = date.week();
    
    const isValid = !date.isAfter(maxDate) &&
                   !date.isBefore(minDate) &&
                   !(week % 2 === 1 && date.day() === 0) &&
                   !(isPrime(week) && date.day() === 5);
                   
    if (isValid) return date;
    
  } while (true);
};

module.exports = { isPrime, getValidDate }; 