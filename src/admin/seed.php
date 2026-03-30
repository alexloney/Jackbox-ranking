<?php
session_start();

include '../api/db.php';

$gamesToSeed = [
    [ "pack" => "Party Pack 1", "name" => "You Don't Know Jack 2015", "img" => "img/pp1/you-dont-know-jack-2015.png" ],
    [ "pack" => "Party Pack 1", "name" => "Drawful", "img" => "img/pp1/drawful.png" ],
    [ "pack" => "Party Pack 1", "name" => "Word Spud", "img" => "img/pp1/word-spud.png" ],
    [ "pack" => "Party Pack 1", "name" => "Lie Swatter", "img" => "img/pp1/lie-swatter.png" ],
    [ "pack" => "Party Pack 1", "name" => "Fibbage XL", "img" => "img/pp1/fibbage-xl.png" ],

    [ "pack" => "Party Pack 2", "name" => "Fibbage 2", "img" => "img/pp2/fibbage-2.png" ],
    [ "pack" => "Party Pack 2", "name" => "Earwax", "img" => "img/pp2/earwax.png" ],
    [ "pack" => "Party Pack 2", "name" => "Bidiots", "img" => "img/pp2/bidiots.png" ],
    [ "pack" => "Party Pack 2", "name" => "Quiplash", "img" => "img/pp2/quiplash.png" ],
    [ "pack" => "Party Pack 2", "name" => "Bomb Corp.", "img" => "img/pp2/bomb-corp.png" ],

    [ "pack" => "Party Pack 3", "name" => "Trivia Murder Party", "img" => "img/pp3/trivia-murder-party.png" ],
    [ "pack" => "Party Pack 3", "name" => "Quiplash 2", "img" => "img/pp3/quiplash-2.png" ],
    [ "pack" => "Party Pack 3", "name" => "Guesspionage", "img" => "img/pp3/guesspionage.png" ],
    [ "pack" => "Party Pack 3", "name" => "Tee K.O.", "img" => "img/pp3/tee-ko.png" ],
    [ "pack" => "Party Pack 3", "name" => "Fakin' It", "img" => "img/pp3/fakin-it.png" ],

    [ "pack" => "Party Pack 4", "name" => "Fibbage 3", "img" => "img/pp4/fibbage-3.png" ],
    [ "pack" => "Party Pack 4", "name" => "Survive the Internet", "img" => "img/pp4/survive-the-internet.png" ],
    [ "pack" => "Party Pack 4", "name" => "Monster Seeking Monster", "img" => "img/pp4/monster-seeking-monster.png" ],
    [ "pack" => "Party Pack 4", "name" => "Bracketeering", "img" => "img/pp4/bracketeering.png" ],
    [ "pack" => "Party Pack 4", "name" => "Civic Doodle", "img" => "img/pp4/civic-doodle.png" ],

    [ "pack" => "Party Pack 5", "name" => "You Don't Know Jack: Full Stream", "img" => "img/pp5/you-dont-know-jack-full-stream.png" ],
    [ "pack" => "Party Pack 5", "name" => "Split the Room", "img" => "img/pp5/split-the-room.png" ],
    [ "pack" => "Party Pack 5", "name" => "Mad Verse City", "img" => "img/pp5/mad-verse-city.png" ],
    [ "pack" => "Party Pack 5", "name" => "Patently Stupid", "img" => "img/pp5/patently-stupid.png" ],
    [ "pack" => "Party Pack 5", "name" => "Zeeple Dome", "img" => "img/pp5/zeeple-dome.png" ],

    [ "pack" => "Party Pack 6", "name" => "Trivia Murder Party 2", "img" => "img/pp6/trivia-murder-party-2.png" ],
    [ "pack" => "Party Pack 6", "name" => "Role Models", "img" => "img/pp6/role-models.png" ],
    [ "pack" => "Party Pack 6", "name" => "Joke Boat", "img" => "img/pp6/joke-boat.png" ],
    [ "pack" => "Party Pack 6", "name" => "Dictionarium", "img" => "img/pp6/dictionarium.png" ],
    [ "pack" => "Party Pack 6", "name" => "Push The Button", "img" => "img/pp6/push-the-button.png" ],
    
    [ "pack" => "Party Pack 7", "name" => "Quiplash 3", "img" => "img/pp7/quiplash-3.png" ],
    [ "pack" => "Party Pack 7", "name" => "The Devils and the Details", "img" => "img/pp7/the-devils-and-the-details.png" ],
    [ "pack" => "Party Pack 7", "name" => "Champ'd Up", "img" => "img/pp7/champd-up.png" ],
    [ "pack" => "Party Pack 7", "name" => "Talking Points", "img" => "img/pp7/talking-points.png" ],
    [ "pack" => "Party Pack 7", "name" => "Blather 'Round", "img" => "img/pp7/blather-round.png" ],

    [ "pack" => "Party Pack 8", "name" => "Job Job", "img" => "img/pp8/job-job.png" ],
    [ "pack" => "Party Pack 8", "name" => "The Poll Mine", "img" => "img/pp8/the-poll-mine.png" ],
    [ "pack" => "Party Pack 8", "name" => "Drawful Animate", "img" => "img/pp8/drawful-animate.png" ],
    [ "pack" => "Party Pack 8", "name" => "The Wheel of Enormous Proportions", "img" => "img/pp8/the-wheel-of-enormous-proportions.png" ],
    [ "pack" => "Party Pack 8", "name" => "Weapons Drawn", "img" => "img/pp8/weapons-drawn.png" ],

    [ "pack" => "Party Pack 9", "name" => "Fibbage 4", "img" => "img/pp9/fibbage-4.png" ],
    [ "pack" => "Party Pack 9", "name" => "Quixort", "img" => "img/pp9/quixort.png" ],
    [ "pack" => "Party Pack 9", "name" => "Junktopia", "img" => "img/pp9/junktopia.png" ],
    [ "pack" => "Party Pack 9", "name" => "Nonsensory", "img" => "img/pp9/nonsensory.png" ],
    [ "pack" => "Party Pack 9", "name" => "Roomerang", "img" => "img/pp9/roomerang.png" ],

    [ "pack" => "Party Pack 10", "name" => "Tee K.O. 2", "img" => "img/pp10/tee-ko-2.png" ],
    [ "pack" => "Party Pack 10", "name" => "FixyText", "img" => "img/pp10/fixytext.png" ],
    [ "pack" => "Party Pack 10", "name" => "Hypnotorious", "img" => "img/pp10/hypnotorious.png" ],
    [ "pack" => "Party Pack 10", "name" => "Timejinx", "img" => "img/pp10/timejinx.png" ],
    [ "pack" => "Party Pack 10", "name" => "Dodo Re Mi", "img" => "img/pp10/dodo-re-mi.png" ],

    [ "pack" => "Party Pack 11", "name" => "Legends of Trivia", "img" => "img/pp11/legends-of-trivia.png" ],
    [ "pack" => "Party Pack 11", "name" => "Suspectives", "img" => "img/pp11/suspectives.png" ],
    [ "pack" => "Party Pack 11", "name" => "Doominate", "img" => "img/pp11/doominat.png" ],
    [ "pack" => "Party Pack 11", "name" => "Hear Say", "img" => "img/pp11/hear-say.png" ],
    [ "pack" => "Party Pack 11", "name" => "Cookie Haus", "img" => "img/pp11/cookie-haus.png" ],

    [ "pack" => "The Naughty Pack", "name" => "Fakin' It All Night Long", "img" => "img/tnp/fakin-it-all-night-long.png" ],
    [ "pack" => "The Naughty Pack", "name" => "Dirty Drawful", "img" => "img/tnp/dirty-drawful.png" ],
    [ "pack" => "The Naughty Pack", "name" => "Let Me Finish", "img" => "img/tnp/let-me-finish.png" ],

    [ "pack" => "Standalone", "name" => "The Jackbox Survey Scramble", "img" => "img/s/the-jackbox-survey-scramble.png" ],
    [ "pack" => "Standalone", "name" => "Drawful 2", "img" => "img/s/drawful-2.png" ]
];

foreach ($gamesToSeed as $game) {
    echo "Seeding game: {$game['name']} from pack: {$game['pack']}<br>";

    $stmt = $pdo->prepare('INSERT INTO games (name, pack, img) VALUES (?, ?, ?)');
    $stmt->execute([$game['name'], $game['pack'], $game['img']]);
}
echo "Seeding completed.<br>";
