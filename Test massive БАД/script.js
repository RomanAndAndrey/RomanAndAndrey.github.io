<!DOCTYPE html>
<html lang="en">


<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Иванов Иван. ИС 3.1</title>
    <link rel="stylesheet" href="style.css">
</head>


<body>
    <h1>Тест по информатике</h1>
    <table border="1" id="q1">
        <tr>
            <td rowspan="3">1</td>
            <td colspan="4" class="task">
                Автоматическое устройство осуществило перекодировку информационного сообщения на русском языке,
                первоначально записанного в 16-битном коде Unicode, в 8-битную кодировку КОИ-8. При этом информационное
                сообщение уменьшилось на 480 бит. Какова длина сообщения в символах?
            </td>
        </tr>
        <tr>
            <td class="variant">1) 30</td>
            <td class="variant">2) 60</td>
            <td class="variant">3) 120</td>
            <td class="variant">4) 480</td>
        </tr>
        <tr>
            <td colspan="5">
                <input id="a1" type="text" class="answer" placeholder="Ответ" />
            </td>
        </tr>
    </table>


    <table border="1" id="q2">
        <tr>
            <td rowspan="3">1</td>
            <td colspan="4" class="task">
                1.  Информационное сообщение объемом 450 бит состоит из 150 символов. Каков информационный вес каждого символа этого сообщения?
            </td>
        </tr>
        <tr>
            <td class="variant">1) 5 бит</td>
            <td class="variant">2) 30 бит</td>
            <td class="variant">3) 3 бита</td>
            <td class="variant">4) 3 байта</td>
        </tr>
        <tr>
            <td colspan="5">
                <input id="a2" type="text" class="answer" placeholder="Ответ" />
            </td>
        </tr>
    </table>


    <table border="1" id="q3">
        <tr>
            <td rowspan="3">1</td>
            <td colspan="4" class="task">
                2.  Информационное сообщение объемом 3 Кбайта содержит 6144 символа. Сколько символов содержит алфавит, при помощи которого было записано это сообщение?
            </td>
        </tr>
        <tr>
            <td class="variant">1) 4</td>
            <td class="variant">2) 16</td>
            <td class="variant">3) 8</td>
            <td class="variant">4) 32</td>
        </tr>
        <tr>
            <td colspan="5">
                <input id="a3" type="text" class="answer" placeholder="Ответ" />
            </td>
        </tr>
    </table>




   


    <button onclick="Check()">Проверить</button>
    <div>Правильно:<span id="score"></span></div>
    <p>Разработчики:
        Иванов Иван, Петров Андрей
    </p>


    <script>


        function Check() {
            let answers=['1','2','3'];//массив с ответами
           
            let questions=3;
            let score=0;
            for(let i=1;i<=answers.length;i++)//создаем цикл от 1 до длины массива answers. Переменная i-будет счетчиком цикла(1,2,3)
        {
            let q = document.getElementById('q'+i);//получаем ссылку на объект table с вопросом
            let a = document.getElementById('a'+i);//получаем ссылку на объект input с ответом пользователя
            if (a.value == answers[i-1]) {//если ответ совпадает с правильным ответом
                q.style.border = '1px solid green ';//окрашиваем табличку с вопросом в зеленый цвет
                score++;//увеличиваем количество правильных ответов
            }
            else {
                q.style.border = '1px solid red'; //если ответ не совпадает, то окрашиваем табличку в красный цвет
            }
        }


            document.getElementById('score').innerHTML=score;//находим элемент с id score и меняем его внутреннее содержимое на score


        }
    </script>
</body>


</html>
