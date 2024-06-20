# Для запуска проекта, необходимо выполнить следующие шаги:

1. Склонировать репозиторий с API и клиентским приложением по ссылке https://github.com/slozhkai/Social-Network-Application на свой компьютер.
```
git clone https://github.com/slozhkai/Social-Network-Application
```


2. Открыть терминал (или командную строку) и перейти в корневую директорию сервера.
```
cd express-threads-api
```

4. Переименовать файл .env.local (убрать .local)
```
.env
```

5. Запустить команду docker compose которая поднимет сервер, клиент и базу данных
```
docker compose up
```

6. Открыть браузер и перейти по адресу http://localhost:80, чтобы увидеть запущенный проект.



# Что бы скачать образ базы данных MongoDB необходимо ввести следующую команду

Запустите контейнер с образом MongoDB и настройками replica set (он автоматичиски скачает и запустит этот образ):

```
  docker run --name mongo \
       -p 27017:27017 \
       -e MONGO_INITDB_ROOT_USERNAME="monty" \
       -e MONGO_INITDB_ROOT_PASSWORD="pass" \
       -d prismagraphql/mongo-single-replica:5.0.3
```


# Стек технологий:

- Express.js
- Docker
- MongoDB
- Prisma
- React
- Redux Toolkit
- NextUI 
- Tailwindcss

