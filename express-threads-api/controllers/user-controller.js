const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require('fs');
const jwt = require("jsonwebtoken");
const { prisma } = require("../prisma/prisma-client");
const Jdenticon = require('jdenticon');
const nodemailer = require('nodemailer');

const UserController = {
  register: async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "Пользователь уже существует" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const emailToken = jwt.sign({ email }, process.env.EMAIL_KEY, { expiresIn: '1d' });
      const verificationURL = `http://localhost:3000/api/verify-email?token=${emailToken}`;

      const testAccount = await nodemailer.createTestAccount();
      let transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      try {
        let info = await transporter.sendMail({
          from: '"Example Team" <example@example.com>',
          to: email,
          subject: 'Подтверждение email',
          text: `Перейдите по ссылке для подтверждения Вашего Email: ${verificationURL}`,
        });
        console.log("Message sent: %s", info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      } catch (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ error: "Ошибка при отправке email" });
      }

      const png = Jdenticon.toPng(name, 200);
      const avatarName = `${name}_${Date.now()}.png`;
      const avatarPath = path.join(__dirname, '/../uploads', avatarName);
      fs.writeFileSync(avatarPath, png);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          avatarUrl: `/uploads/${avatarName}`,
          isVerified: false,
          status: "pending"
        },
      });

      res.json({ message: "Пожалуйста, подтвердите ваш email", user });
    } catch (error) {
      console.error("Ошибка в регистрации:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  verifyEmail: async (req, res) => {
    const { token } = req.query;

    try {
      const { email } = jwt.verify(token, process.env.EMAIL_KEY);
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || user.status !== 'pending') {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      await prisma.user.update({
        where: { email },
        data: {
          isVerified: true,
          status: "verified" // обновление статуса
        }
      });

      res.status(200).json({ message: "Email successfully verified" });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  login: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Все поля обязательны" });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(400).json({ error: "Неверный логин или пароль" });
      }

      console.log(user);

      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        return res.status(400).json({ error: "Неверный логин или пароль" });
      }


      // Generate a JWT
      const token = jwt.sign({ userId: user.id }, process.env.SECRET_KEY); // Разобраться в чем проблема


      console.log(user);
      res.json({ token });
    } catch (error) {
      console.error("Error in login:", error);
      res.status(500).json({ error: "Internal server error" });
    }

    console.log(email, password);
  },

  getUserById: async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          followers: true,
          following: true
        }
      });

      if (!user) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      // Проверяем, подписан ли текущий пользователь на пользователя
      const isFollowing = await prisma.follows.findFirst({
        where: {
          AND: [
            { followerId: userId },
            { followingId: id }
          ]
        }
      });

      res.json({ ...user, isFollowing: Boolean(isFollowing) });
    } catch (error) {
      res.status(500).json({ error: "Что-то пошло не так" });
    }
  },

  updateUser: async (req, res) => {
    const { id } = req.params;
    const { email, name, dateOfBirth, bio, location } = req.body;

    let filePath;

    if (req.file && req.file.path) {
      filePath =  req.file.path;
    }

    // Проверка, что пользователь обновляет свою информацию
    if (id !== req.user.userId) {
      return res.status(403).json({ error: "Нет доступа" });
    }

    try {
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: { email: email },
        });
    
        if (existingUser && existingUser.id !== parseInt(id)) {
          return res.status(400).json({ error: "Почта уже используется" });
        }
     }

      const user = await prisma.user.update({
        where: { id },
        data: {
          email: email || undefined,
          name: name || undefined,
          avatarUrl: filePath ? `/${filePath}` : undefined,
          dateOfBirth: dateOfBirth || undefined,
          bio: bio || undefined,
          location: location || undefined,
        },
      });
      res.json(user);
    } catch (error) {
      console.log('error', error)
      res.status(500).json({ error: "Что-то пошло не так" });
    }
  },

  current: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          followers: {
            include: {
              follower: true
            }
          },
          following: {
            include: {
              following: true
            }
          }
        }
      });

      if (!user) {
        return res.status(400).json({ error: "Не удалось найти пользователя" });
      }

      return res.status(200).json(user)
    } catch (error) {
      console.log('err', error)
      res.status(500).json({ error: "Что-то пошло не так" });
    }
  }
};

module.exports = UserController;
