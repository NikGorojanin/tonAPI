const TonWeb = require("tonweb");
const tonMnemonic = require("tonweb-mnemonic");

const express = require('express');
const {json} = require("express");

const app = express();

const jsonParser = express.json();

const mnemonic = [
    "excess",
    "spawn",
    "course",
    "phrase",
    "mother",
    "fold",
    "beyond",
    "crystal",
    "mother",
    "erase",
    "word",
    "category",
    "improve",
    "real",
    "great",
    "empower",
    "toddler",
    "language",
    "vanish",
    "hand",
    "quantum",
    "eight",
    "foster",
    "age"
]

const APIKEY = 'ea7b8fd74f15e1c34d735dd48463959a4a970aaf8cd65c2e4470d4ce73828fe7'


app.get('/api/v1/test', function (request, response){
    response.send({'status': 'ok'});
});

app.post('/api/v1/test', jsonParser, async function (
    request,
    response
) {
    if(!request.body) return response.sendStatus(400);

    const amount = request.body.amount;

    response.send({
        'result': 'ok',
        'amount': amount,
    })
});

app.post('/api/v1/send', jsonParser, async function (
    request,
    response
) {
    if(!request.body) return response.sendStatus(400);

    const amount = request.body.amount;
    const destinationWallet = request.body.destination_wallet;

    if (!amount) return response.sendStatus(400);

    const keyPair = await tonMnemonic.mnemonicToKeyPair(mnemonic);

    const tonweb = new TonWeb(new TonWeb.HttpProvider(
        'https://toncenter.com/api/v2/jsonRPC',
        {apiKey: APIKEY}
    ));

    const WalletClass = tonweb.wallet.all["v4R2"];
    const wallet = new WalletClass(tonweb.provider, {
        publicKey: keyPair.publicKey,
        wc: 0
    });
    const walletAddress = (await wallet.getAddress()).toString(true, true, true);
    const walletInfo = await tonweb.provider.getWalletInfo(walletAddress);
    const walletBalance = await tonweb.getBalance(walletAddress);

    var balance = walletBalance/1000000000

    const seqno = await wallet.methods.seqno().call(); // call get-method `seqno` of wallet smart contract

    const query = await wallet.methods.transfer(
        {
            secretKey: keyPair.secretKey,
            toAddress: destinationWallet,
            amount: TonWeb.utils.toNano(amount),
            seqno: seqno,
            payload: 'Congratulations!',
            sendMode: 3
        }
    )

    const transferSended = await query.send();
    console.log(transferSended);
    if (transferSended["@type"] === "ok") {
        // SUCCESS
        const walletBalance = await tonweb.getBalance(walletAddress);
        balance =  walletBalance/1000000000

        response.send({
            'result': 'ok',
            'balance': balance,
        });

    } else {
        response.send({
            'result': 'fail',
            'status': transferSended["@type"],
        });
    }
});

app.post('/api/v1/history', jsonParser, async function (
    request,
    response) {

    let lastTransactionHash = undefined;
    if (typeof request.body != 'undefined')
        lastTransactionHash = request.body.last_transaction_hash

    const keyPair = await tonMnemonic.mnemonicToKeyPair(mnemonic);

    const tonweb = new TonWeb(new TonWeb.HttpProvider(
        'https://toncenter.com/api/v2/jsonRPC',
        {apiKey: APIKEY}
    ));

    const WalletClass = tonweb.wallet.all["v4R2"];
    const wallet = new WalletClass(tonweb.provider, {
        publicKey: keyPair.publicKey,
        wc: 0
    });
    const walletAddress = await wallet.getAddress();
    const transactions = await tonweb.getTransactions(walletAddress);

    //sort by transaction time
    transactions.sort(function (first, second) {
       return first['utime'] - second['utime'];
    });

    let result = []
    let addToResult = (typeof lastTransactionHash == 'undefined');

    for (let i=0;i<transactions.length;i++){
        let transaction = transactions[i];

        //filter outgoing payments
        if (transaction['out_msgs'].length > 0)
            continue;

        if (addToResult) {
            result.push({
                'hash': transaction['transaction_id']['hash'],
                'source': transaction['in_msg']['source'],
                'destination': transaction['in_msg']['destination'],
                'value': transaction['in_msg']['value'],
                'utime': transaction['utime'],
            })
        }

        if (lastTransactionHash)
            if (transaction['transaction_id']['hash'].toString() === lastTransactionHash.toString())
                addToResult = true;
    }

    response.send({
        'result': result,
    });
})

app.listen(3000);
