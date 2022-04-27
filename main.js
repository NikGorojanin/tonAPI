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
    if (!destinationWallet) return response.sendStatus(400);

    try {
        console.log('Getting key pair from mnemonic...')
        const keyPair = await tonMnemonic.mnemonicToKeyPair(mnemonic);
        console.log('Key pair getting done')

        console.log('Tonweb initialization...');
        const tonweb = new TonWeb(new TonWeb.HttpProvider(
            'https://toncenter.com/api/v2/jsonRPC',
            {apiKey: APIKEY}
        ));
        console.log('Tonweb initialized');

        console.log('Getting wallet class...')
        const WalletClass = tonweb.wallet.all["v4R2"];
        console.log('Wallet class got.')

        console.log('Wallet initialization...');
        const wallet = new WalletClass(tonweb.provider, {
            publicKey: keyPair.publicKey,
            wc: 0
        });
        console.log('Wallet initialized');

        console.log('Wallet address');
        const walletAddress = (await wallet.getAddress()).toString(true, true, true);

        console.log('Getting seqno...');
        const seqno = await wallet.methods.seqno().call(); // call get-method `seqno` of wallet smart contract

        console.log('Build query...');
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

        console.log('Send query...');
        const transferSended = await query.send();

        if (transferSended["@type"] === "ok") {
            // SUCCESS
            const walletBalance = await tonweb.getBalance(walletAddress);
            let balance = walletBalance / 1000000000

            response.send({
                'status': 'ok',
                'result': {
                    'balance': balance,
                },
            });

        } else {
            response.send({
                'status': 'error',
                'result': {
                    'transfer_status': transferSended["@type"]
                },
            });
        }
    }
    catch (e) {
        console.log(e);

        response.send({
            'status': 'error',
            'result': {
                'error_message': e
            },
        });
    }
});

app.post('/api/v1/history', jsonParser, async function (
    request,
    response) {
    try {
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

        for (let i = 0; i < transactions.length; i++) {
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
            'status': 'ok',
            'result': result,
        });
    }
    catch (e) {
        console.log(e);
        response.send({
            'status': 'error',
            'result': {
                'error_message': e
            },
        });
    }
})

app.listen(3000);
