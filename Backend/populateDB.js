const mongoose = require('mongoose');
const User = require('./models/userModel');
const Roadmap = require('./models/roadmapModel');
const Quiz = require('./models/quizModel');
const QuizAttempt = require('./models/quizAttemptSchema');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const genAi = new GoogleGenerativeAI(process.env.LLM_API_KEY);
const model = genAi.getGenerativeModel({ model: "gemini-pro" })

const usersFilePath = path.join(__dirname, 'users.json');
const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));
console.log(`Number of users: ${usersData.length}`);

mongoose.connect('mongodb://localhost:27017/techfiesta').then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Error connecting to MongoDB', err);
});

const createUsers = async function () {
    try {
        let uniqueDomainInterests = new Set();

        for (const user of usersData) {
            const newUser = new User(user);
            const hashedPassword = await bcrypt.hash(newUser.password, 10);
            newUser.password = hashedPassword;

            for (const domainInterest of newUser.learningParameters.domainInterest) {
                uniqueDomainInterests.add(domainInterest);
            }

            await newUser.save();
        }
        console.log(`Number of unique domain interests: ${uniqueDomainInterests.size}`);
        fs.writeFileSync(path.join(__dirname, 'domainInterests.json'), JSON.stringify(Array.from(uniqueDomainInterests), null, 2));
    }
    catch(e) {
        console.error('Error creating users', e);
    }
    finally {
        mongoose.connection.close();
    }    
}

const createRoadmaps = async function () {
    try{
        const users = usersData;

        for (const user of users) {
            const _login = await fetch('http://localhost:5000/api/users/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: user.email,
                    password: user.password,
                })
            });
            const data = await _login.json();
            const token = data.token;

            const roadmaps = [];
            for (let i = 0; i < 2; i++) {
                const prompt = `give two topics seperated by comma related to ${user.learningParameters.domainInterest[Math.floor(Math.random() * user.learningParameters.domainInterest.length)]}
                    only give two topics as output nothing else. 
                `;
                const result = await model.generateContent(prompt);
                const response = result.response;
                const topics = response.text().split(','); 

                for (const topic of topics) {
                    const response = await fetch(`http://localhost:5000/api/roadmaps/create`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            user: user._id,
                            topic: topic,
                        })
                    })
                    if(response.ok) {
                        const data = await response.json();
                        roadmaps.push(data._id);
                    }
                }
            }
        }
    }catch(e){
        console.error('Error creating roadmaps', e);
    }
}

// createUsers();
createRoadmaps();


// const usersFilePath = path.join(__dirname, 'users.json');
// const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));

// const topics = ['Math', 'Science', 'History', 'Literature', 'Technology', 'Art', 'Music', 'Sports', 'Geography', 'Politics'];

// const createRoadmaps = async (userId, topics) => {
//     let roadmaps = [];
//     for (let i = 0; i < 5; i++) {
//         const topic = topics[Math.floor(Math.random() * topics.length)];
//         const roadmap = new Roadmap({
//             user: userId,
//             topic: topic,
//             // Add other necessary fields for the roadmap
//         });
//         await roadmap.save();
//         roadmaps.push(roadmap._id);
//     }
//     return roadmaps;
// };

// const createQuizAttempts = async (userId, topics) => {
//     let quizAttempts = [];
//     for (let i = 0; i < 5; i++) {
//         const topic = topics[Math.floor(Math.random() * topics.length)];
//         const quiz = await Quiz.findOne({ topic: topic }).populate('questions');
//         if (quiz) {
//             const answers = quiz.questions.map(q => q.options[Math.floor(Math.random() * q.options.length)]);
//             const attempt = await QuizAttempt.createAttempt(quiz._id, userId, answers);
//             quizAttempts.push(attempt._id);
//         }
//     }
//     return quizAttempts;
// };

// const populateDatabase = async () => {
//     try {
//         await User.deleteMany({});
//         await Roadmap.deleteMany({});
//         await QuizAttempt.deleteMany({});

//         for (const userData of usersData) {
//             const user = new User(userData);
//             await user.save();

//             const userTopics = [];
//             for (let i = 0; i < 3; i++) {
//                 const topic = topics[Math.floor(Math.random() * topics.length)];
//                 if (!userTopics.includes(topic)) {
//                     userTopics.push(topic);
//                 }
//             }

//             const roadmaps = await createRoadmaps(user._id, userTopics);
//             const quizAttempts = await createQuizAttempts(user._id, userTopics);

//             user.roadmaps = roadmaps;
//             user.quizzes = quizAttempts;
//             await user.save();
//         }

//         console.log('Database has been successfully populated');
//     } catch (err) {
//         console.error('Error populating database', err);
//     } finally {
//         mongoose.connection.close();
//     }
// };

// populateDatabase();