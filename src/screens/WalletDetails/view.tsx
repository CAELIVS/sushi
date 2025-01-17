import React, { useState } from 'react';
import sortBy from 'ramda/es/sortBy';
import reverse from 'ramda/es/reverse';
import Text from 'components/base/Text';
import {
  ScrollView,
  View,
  StatusBar,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStyles from './styles';
import { WalletDetailsProps } from './props';
import { Back, Delete, Edit } from 'components/base/SVG';
import { Transaction } from 'store/transactions';
import TransactionCard from 'components/module/TransactionCard';
import AlertModal from 'components/module/AlertModal';
import { formatCurrency } from 'utils/formatCurrency';
import SmartText from 'components/smart/SmartText';
import SmartAlertModal from 'components/smart/SmartAlertModal';
import { groupBy } from 'ramda';
import { formatDate } from 'utils/formatDate';

const WalletDetailsView = (props: WalletDetailsProps) => {
  const { navigation, wallet, transactions, wallets, deleteWallet, language } =
    props;
  const { styles, theme, colors } = useStyles();

  const walletTransactions = Object.keys(transactions)
    .map((key) => transactions[key])
    .filter(
      (transaction) =>
        transaction.sourceWalletId === wallet.id ||
        transaction.destinationWalletId === wallet.id,
    );

  const balanceBreakdown = walletTransactions.reduce(
    (accum, transaction) => {
      if (transaction.destinationWalletId === wallet.id) {
        // reverse calculation because it is a transfer
        if (transaction.amount < 0) {
          return {
            income: accum.income + Math.abs(transaction.amount),
            expenses: accum.expenses,
          };
        } else if (transaction.amount > 0) {
          return {
            income: accum.income,
            expenses: accum.expenses + Math.abs(transaction.amount),
          };
        }
      } else {
        // normal calculation
        if (transaction.amount > 0) {
          return {
            income: accum.income + Math.abs(transaction.amount),
            expenses: accum.expenses,
          };
        } else if (transaction.amount < 0) {
          return {
            income: accum.income,
            expenses: accum.expenses + Math.abs(transaction.amount),
          };
        }
      }

      return {
        income: accum.income,
        expenses: accum.expenses,
      };
    },
    {
      income: 0,
      expenses: 0,
    },
  );

  const currentBalance =
    wallet.initialAmount + balanceBreakdown.income - balanceBreakdown.expenses;

  const sortTransactionByDate = sortBy(
    (transaction: Transaction) => transaction.paidAt,
  );

  const sortedTransactionsArray = reverse(
    sortTransactionByDate(walletTransactions),
  );

  const groupByDate = groupBy((transaction: Transaction) =>
    formatDate(transaction.paidAt, 'MMMM d yyyy'),
  );

  const groupedTransactionsArray = Object.entries(
    groupByDate(sortedTransactionsArray),
  ).map(([title, data]) => ({ title, data }));

  const renderTransaction = ({ item: transaction }: { item: Transaction }) => {
    const sourceWallet = wallets[transaction.sourceWalletId];
    const destinationWallet = transaction.destinationWalletId
      ? wallets[transaction.destinationWalletId]
      : null;
    return (
      <TransactionCard
        containerStyle={styles.transactionCard}
        key={transaction.id}
        category={transaction.category}
        amount={transaction.amount}
        sourceWallet={sourceWallet.label}
        destinationWallet={destinationWallet?.label}
        paidAt={transaction.paidAt}
        onPress={() =>
          navigation.navigate('TRANSACTION_DETAILS', {
            transactionId: transaction.id,
          })
        }
        theme={theme}
        language={language}
      />
    );
  };

  const [showDelete, setShowDelete] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor={colors.BACKGROUND}
        barStyle={theme.base === 'Dark' ? 'light-content' : 'dark-content'}
      />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeftAction}
          onPress={() => {
            navigation.goBack();
          }}>
          <Back fill={colors.PRIMARY_TEXT} width={24} height={24} />
        </TouchableOpacity>
        <SmartText
          containerStyle={styles.headerTitleContainer}
          variant="title"
          theme={theme}
          translationKey="ACCOUNT_DETAILS"
        />
        <TouchableOpacity
          style={styles.headerRightAction}
          onPress={() => {
            navigation.navigate('EDIT_WALLET', {
              walletId: wallet.id,
            });
          }}>
          <Edit fill={colors.PRIMARY_TEXT} width={24} height={24} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerRightAction}
          onPress={() => {
            setShowDelete(true);
          }}>
          <Delete fill={colors.PRIMARY_TEXT} width={24} height={24} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.detailsCard}>
          <View style={styles.detailsCardRow}>
            <Text theme={theme}>{wallet.label}</Text>
            <Text variant="subtitle" theme={theme}>
              {formatCurrency(currentBalance, { language })}
            </Text>
          </View>
          <View style={styles.detailsCardRow}>
            <SmartText
              variant="label"
              theme={theme}
              translationKey="INITIAL_BALANCE"
            />
            <Text variant="body" theme={theme}>
              {formatCurrency(wallet.initialAmount, { language })}
            </Text>
          </View>
          <View style={styles.detailsCardRow}>
            <SmartText variant="label" theme={theme} translationKey={'DEBIT'} />
            <Text variant="body" theme={theme}>
              {formatCurrency(balanceBreakdown.income, { language })}
            </Text>
          </View>
          <View style={styles.detailsCardRow}>
            <SmartText
              variant="label"
              theme={theme}
              translationKey={'CREDIT'}
            />
            <Text variant="body" theme={theme}>
              {formatCurrency(balanceBreakdown.expenses, { language })}
            </Text>
          </View>
        </View>
        <View style={styles.transactionsContainer}>
          <SectionList
            contentContainerStyle={styles.contentScroll}
            sections={groupedTransactionsArray}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section: { title } }) => (
              <Text variant="subtitle" theme={theme} style={styles.dateText}>
                {title}
              </Text>
            )}
            renderItem={({ item }) => renderTransaction({ item: item })}
          />
        </View>
      </View>
      <SmartAlertModal
        theme={theme}
        titleTranslationKey="DELETE_ACCOUNT"
        descriptionTranslationKey="DELETE_ACCOUNT_INFO"
        descriptionReplacementRecord={{
          accountName: wallet.label,
          transactionCount: walletTransactions.length.toString(),
        }}
        visible={showDelete}
        actions={[
          {
            label: 'Keep',
            onPress: () => {
              setShowDelete(false);
            },
          },
          {
            label: 'Delete',
            onPress: () => {
              setShowDelete(false);
              deleteWallet();
            },
          },
        ]}
      />
    </SafeAreaView>
  );
};

export default WalletDetailsView;
