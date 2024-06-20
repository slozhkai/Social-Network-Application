var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var path = require('path');
var fs = require('fs');
require('dotenv').config();

var app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'pug');
// Раздавать статические файлы из папки 'uploads'
app.use('/uploads', express.static('uploads'));

app.use('/api', require('./routes'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Обработка маршрутов
app.use('/api', require('./routes'));

// Проверка и создание директории uploads, если её нет
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Обработка 404 ошибки - должна быть последней в цепочке middleware до обработки ошибок
app.use(function(req, res, next) {
  next(createError(404));
});

// Обработка ошибок
app.use(function(err, req, res, next) {
  console.error(err.stack); // Вывод ошибки в консоль для отладки

  // Отправка JSON-ответа с информацией об ошибке
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      stack: req.app.get('env') === 'development' ? err.stack : undefined
    }
  });
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
